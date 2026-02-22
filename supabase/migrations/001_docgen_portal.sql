-- =============================================================================
-- Migration 001: DocGen Portal
-- Virtue Compliance GmbH
-- Created: 2026-02-22
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. organizations TABLE (created first so profiles can reference it)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  short_name   text,
  industry     text,
  sro          text,
  contact_name text,
  contact_role text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. ALTER profiles TABLE
-- Assumes profiles table already exists (created by Supabase Auth trigger).
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role           text    NOT NULL DEFAULT 'client'
                                          CHECK (role IN ('admin', 'client')),
  ADD COLUMN IF NOT EXISTS full_name      text,
  ADD COLUMN IF NOT EXISTS organization_id uuid   REFERENCES public.organizations(id)
                                          ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3. organization_members TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'member',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- -----------------------------------------------------------------------------
-- 4. company_profiles TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data            jsonb       NOT NULL DEFAULT '{}',
  completed       boolean     NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 5. documents TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_type        text        NOT NULL,
  name            text        NOT NULL,
  content         text,
  jurisdiction    text        NOT NULL DEFAULT 'CH',
  version         text        NOT NULL DEFAULT 'v1.0',
  status          text        NOT NULL DEFAULT 'review'
                              CHECK (status IN ('draft', 'review', 'current', 'outdated')),
  format          text        NOT NULL DEFAULT 'DOCX',
  pages           int,
  legal_basis     text,
  wizard_answers  jsonb,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. regulatory_alerts TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.regulatory_alerts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  source         text,
  jurisdiction   text        NOT NULL DEFAULT 'CH',
  date           text,
  severity       text        CHECK (severity IN ('critical', 'high', 'medium', 'info')),
  status         text        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new', 'acknowledged', 'in_progress', 'resolved')),
  category       text,
  summary        text,
  legal_basis    text,
  deadline       text,
  elena_comment  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. alert_action_items TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.alert_action_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id   uuid        NOT NULL REFERENCES public.regulatory_alerts(id) ON DELETE CASCADE,
  text       text        NOT NULL,
  priority   text        NOT NULL DEFAULT 'medium',
  due        text,
  status     text        NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. alert_affected_clients TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.alert_affected_clients (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        uuid        NOT NULL REFERENCES public.regulatory_alerts(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id)     ON DELETE CASCADE,
  reason          text,
  risk            text        NOT NULL DEFAULT 'medium',
  elena_comment   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. client_alert_actions TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_alert_actions (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_affected_client_id uuid        NOT NULL REFERENCES public.alert_affected_clients(id) ON DELETE CASCADE,
  text                     text        NOT NULL,
  due                      text,
  status                   text        NOT NULL DEFAULT 'pending',
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 10. alert_related_documents TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.alert_related_documents (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_affected_client_id uuid NOT NULL REFERENCES public.alert_affected_clients(id) ON DELETE CASCADE,
  document_id              uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  name                     text NOT NULL,
  type                     text,
  date                     text
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Helper: is the current user an admin?
-- Used inline as: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles: users can read own profile" ON public.profiles;
CREATE POLICY "profiles: users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles: admin can read all"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert / update / delete all profiles
CREATE POLICY "profiles: admin can insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "profiles: admin can update"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "profiles: admin can delete"
  ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile (e.g. full_name)
CREATE POLICY "profiles: users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "organizations: admin can select"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "organizations: admin can insert"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "organizations: admin can update"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "organizations: admin can delete"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read their own organization (via organization_members)
CREATE POLICY "organizations: clients can read own org"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = organizations.id
    )
  );

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "organization_members: admin can select"
  ON public.organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "organization_members: admin can insert"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "organization_members: admin can update"
  ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "organization_members: admin can delete"
  ON public.organization_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can read their own memberships
CREATE POLICY "organization_members: users can read own memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- company_profiles
-- -----------------------------------------------------------------------------

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "company_profiles: admin can select"
  ON public.company_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "company_profiles: admin can insert"
  ON public.company_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "company_profiles: admin can update"
  ON public.company_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "company_profiles: admin can delete"
  ON public.company_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read their org's company profile
CREATE POLICY "company_profiles: clients can read own org"
  ON public.company_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = company_profiles.organization_id
    )
  );

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "documents: admin can select"
  ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "documents: admin can insert"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "documents: admin can update"
  ON public.documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "documents: admin can delete"
  ON public.documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read documents for their org
CREATE POLICY "documents: clients can read own org docs"
  ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = documents.organization_id
    )
  );

-- -----------------------------------------------------------------------------
-- regulatory_alerts
-- -----------------------------------------------------------------------------

ALTER TABLE public.regulatory_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "regulatory_alerts: admin can select"
  ON public.regulatory_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "regulatory_alerts: admin can insert"
  ON public.regulatory_alerts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "regulatory_alerts: admin can update"
  ON public.regulatory_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "regulatory_alerts: admin can delete"
  ON public.regulatory_alerts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read alerts that affect their org (via alert_affected_clients)
CREATE POLICY "regulatory_alerts: clients can read alerts affecting their org"
  ON public.regulatory_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_affected_clients aac
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE aac.alert_id = regulatory_alerts.id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- alert_action_items
-- -----------------------------------------------------------------------------

ALTER TABLE public.alert_action_items ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "alert_action_items: admin can select"
  ON public.alert_action_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_action_items: admin can insert"
  ON public.alert_action_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_action_items: admin can update"
  ON public.alert_action_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_action_items: admin can delete"
  ON public.alert_action_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read action items for alerts affecting their org
CREATE POLICY "alert_action_items: clients can read for their org"
  ON public.alert_action_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_affected_clients aac
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE aac.alert_id = alert_action_items.alert_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- alert_affected_clients
-- -----------------------------------------------------------------------------

ALTER TABLE public.alert_affected_clients ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "alert_affected_clients: admin can select"
  ON public.alert_affected_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_affected_clients: admin can insert"
  ON public.alert_affected_clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_affected_clients: admin can update"
  ON public.alert_affected_clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_affected_clients: admin can delete"
  ON public.alert_affected_clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read entries for their org
CREATE POLICY "alert_affected_clients: clients can read own org"
  ON public.alert_affected_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = alert_affected_clients.organization_id
    )
  );

-- -----------------------------------------------------------------------------
-- client_alert_actions
-- -----------------------------------------------------------------------------

ALTER TABLE public.client_alert_actions ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "client_alert_actions: admin can select"
  ON public.client_alert_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "client_alert_actions: admin can insert"
  ON public.client_alert_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "client_alert_actions: admin can update"
  ON public.client_alert_actions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "client_alert_actions: admin can delete"
  ON public.client_alert_actions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read and update actions for their org
CREATE POLICY "client_alert_actions: clients can read for their org"
  ON public.client_alert_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_affected_clients aac
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE aac.id = client_alert_actions.alert_affected_client_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "client_alert_actions: clients can update for their org"
  ON public.client_alert_actions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_affected_clients aac
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE aac.id = client_alert_actions.alert_affected_client_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- alert_related_documents
-- -----------------------------------------------------------------------------

ALTER TABLE public.alert_related_documents ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD all
CREATE POLICY "alert_related_documents: admin can select"
  ON public.alert_related_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_related_documents: admin can insert"
  ON public.alert_related_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_related_documents: admin can update"
  ON public.alert_related_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "alert_related_documents: admin can delete"
  ON public.alert_related_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read related documents for their org
CREATE POLICY "alert_related_documents: clients can read for their org"
  ON public.alert_related_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_affected_clients aac
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE aac.id = alert_related_documents.alert_affected_client_id
        AND om.user_id = auth.uid()
    )
  );
