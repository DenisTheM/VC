-- =============================================================================
-- Migration 019: Client Customer Management (Endkunden-Verwaltung)
-- Tables, triggers, RLS, and indexes for managing end-customers of
-- financial intermediaries, their compliance documents, audit trails,
-- and help requests.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. client_customers — Endkunden der Finanzintermediäre
-- -----------------------------------------------------------------------------

CREATE TABLE public.client_customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_type    text NOT NULL CHECK (customer_type IN ('natural_person', 'legal_entity')),

  -- Natürliche Person
  first_name       text,
  last_name        text,
  date_of_birth    date,
  nationality      text,

  -- Juristische Person
  company_name     text,
  uid_number       text,
  legal_form       text,
  legal_seat       text,
  purpose          text,

  -- Gemeinsam
  address          text,
  risk_level       text NOT NULL DEFAULT 'standard'
                   CHECK (risk_level IN ('low', 'standard', 'elevated', 'high')),
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'archived')),
  notes            text,
  next_review      date,
  zefix_data       jsonb,

  -- Reminder tracking (Phase 7)
  reminder_sent_30d  boolean NOT NULL DEFAULT false,
  reminder_sent_7d   boolean NOT NULL DEFAULT false,
  reminder_sent_overdue boolean NOT NULL DEFAULT false,

  -- Metadata
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_customers_org ON public.client_customers(organization_id);
CREATE INDEX idx_client_customers_org_status ON public.client_customers(organization_id, status);
CREATE INDEX idx_client_customers_review ON public.client_customers(next_review)
  WHERE status = 'active';

-- -----------------------------------------------------------------------------
-- 2. customer_documents — ausgefüllte Template-Instanzen pro Endkunde
-- -----------------------------------------------------------------------------

CREATE TABLE public.customer_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key     text NOT NULL,
  name             text NOT NULL,
  data             jsonb NOT NULL DEFAULT '{}'::jsonb,

  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'outdated')),
  version          int NOT NULL DEFAULT 1,
  rejection_reason text,

  submitted_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at     timestamptz,
  approved_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  rejected_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at      timestamptz,

  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_documents_customer ON public.customer_documents(customer_id);
CREATE INDEX idx_customer_documents_org ON public.customer_documents(organization_id);
CREATE INDEX idx_customer_documents_org_status ON public.customer_documents(organization_id, status);

-- -----------------------------------------------------------------------------
-- 3. customer_document_audit_log — unveränderliches Audit-Log für Dokumente
-- -----------------------------------------------------------------------------

CREATE TABLE public.customer_document_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES public.customer_documents(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  action        text NOT NULL CHECK (action IN ('created','updated','submitted','approved','rejected','outdated')),
  old_status    text,
  new_status    text,
  changed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  details       text,
  data_snapshot jsonb
);

CREATE INDEX idx_cust_doc_audit_document ON public.customer_document_audit_log(document_id, changed_at DESC);
CREATE INDEX idx_cust_doc_audit_customer ON public.customer_document_audit_log(customer_id, changed_at DESC);

-- -----------------------------------------------------------------------------
-- 4. customer_audit_log — Änderungs-Log für Kundenstammdaten
-- -----------------------------------------------------------------------------

CREATE TABLE public.customer_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  action       text NOT NULL CHECK (action IN ('created','updated','status_changed','archived')),
  changed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at   timestamptz NOT NULL DEFAULT now(),
  details      text,
  old_data     jsonb,
  new_data     jsonb
);

CREATE INDEX idx_customer_audit_customer ON public.customer_audit_log(customer_id, changed_at DESC);

-- -----------------------------------------------------------------------------
-- 5. help_requests — Hilfe-Anfragen an Virtue Compliance
-- -----------------------------------------------------------------------------

CREATE TABLE public.help_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id      uuid REFERENCES public.client_customers(id) ON DELETE SET NULL,
  document_id      uuid REFERENCES public.customer_documents(id) ON DELETE SET NULL,
  subject          text NOT NULL,
  message          text NOT NULL,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_progress', 'resolved')),
  requested_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  admin_response   text
);

CREATE INDEX idx_help_requests_org ON public.help_requests(organization_id, created_at DESC);

-- =============================================================================
-- TRIGGERS (SECURITY DEFINER — bypass RLS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6. log_customer_document_change() — Audit-Trigger für customer_documents
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_customer_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_document_audit_log(
      document_id, customer_id, action, new_status, changed_by, details
    ) VALUES (
      NEW.id, NEW.customer_id, 'created', NEW.status,
      COALESCE(NEW.created_by, auth.uid()), 'Dokument erstellt'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'in_review' THEN
        INSERT INTO public.customer_document_audit_log(
          document_id, customer_id, action, old_status, new_status, changed_by, details, data_snapshot
        ) VALUES (
          NEW.id, NEW.customer_id, 'submitted', OLD.status, NEW.status,
          COALESCE(NEW.submitted_by, auth.uid()), 'Zur Prüfung eingereicht', NEW.data
        );
      ELSIF NEW.status = 'approved' THEN
        INSERT INTO public.customer_document_audit_log(
          document_id, customer_id, action, old_status, new_status, changed_by, details, data_snapshot
        ) VALUES (
          NEW.id, NEW.customer_id, 'approved', OLD.status, NEW.status,
          COALESCE(NEW.approved_by, auth.uid()), 'Dokument freigegeben', NEW.data
        );
      ELSIF NEW.status = 'rejected' THEN
        INSERT INTO public.customer_document_audit_log(
          document_id, customer_id, action, old_status, new_status, changed_by, details
        ) VALUES (
          NEW.id, NEW.customer_id, 'rejected', OLD.status, NEW.status,
          COALESCE(NEW.rejected_by, auth.uid()),
          'Abgelehnt: ' || COALESCE(NEW.rejection_reason, 'Kein Grund angegeben')
        );
      ELSIF NEW.status = 'outdated' THEN
        INSERT INTO public.customer_document_audit_log(
          document_id, customer_id, action, old_status, new_status, changed_by, details
        ) VALUES (
          NEW.id, NEW.customer_id, 'outdated', OLD.status, NEW.status,
          auth.uid(), 'Dokument als veraltet markiert'
        );
      END IF;
    -- Data change (no status change)
    ELSIF OLD.data IS DISTINCT FROM NEW.data THEN
      INSERT INTO public.customer_document_audit_log(
        document_id, customer_id, action, old_status, new_status, changed_by, details
      ) VALUES (
        NEW.id, NEW.customer_id, 'updated', OLD.status, NEW.status,
        auth.uid(), 'Formulardaten aktualisiert'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_document_audit
  AFTER INSERT OR UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_customer_document_change();

-- -----------------------------------------------------------------------------
-- 7. log_customer_change() — Audit-Trigger für client_customers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_customer_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_audit_log(
      customer_id, action, changed_by, details,
      new_data
    ) VALUES (
      NEW.id, 'created', COALESCE(NEW.created_by, auth.uid()), 'Kunde angelegt',
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'archived' THEN
      INSERT INTO public.customer_audit_log(
        customer_id, action, changed_by, details,
        old_data, new_data
      ) VALUES (
        NEW.id, 'archived', auth.uid(), 'Kunde archiviert',
        to_jsonb(OLD), to_jsonb(NEW)
      );
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.customer_audit_log(
        customer_id, action, changed_by, details,
        old_data, new_data
      ) VALUES (
        NEW.id, 'status_changed', auth.uid(),
        'Status: ' || COALESCE(OLD.status, '?') || ' → ' || COALESCE(NEW.status, '?'),
        to_jsonb(OLD), to_jsonb(NEW)
      );
    ELSE
      INSERT INTO public.customer_audit_log(
        customer_id, action, changed_by, details,
        old_data, new_data
      ) VALUES (
        NEW.id, 'updated', auth.uid(), 'Kundendaten aktualisiert',
        to_jsonb(OLD), to_jsonb(NEW)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_audit
  AFTER INSERT OR UPDATE ON public.client_customers
  FOR EACH ROW EXECUTE FUNCTION public.log_customer_change();

-- -----------------------------------------------------------------------------
-- 8. notify_on_customer_doc_submit() — In-App-Notification bei Einreichung
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_customer_doc_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _member RECORD;
  _customer_name text;
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'in_review' THEN
    -- Build customer name
    SELECT
      CASE WHEN cc.customer_type = 'natural_person'
        THEN cc.first_name || ' ' || cc.last_name
        ELSE cc.company_name
      END INTO _customer_name
    FROM public.client_customers cc WHERE cc.id = NEW.customer_id;

    -- Notify all approvers in the organization
    FOR _member IN
      SELECT om.user_id FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id
        AND om.role = 'approver'
    LOOP
      INSERT INTO public.notifications(user_id, title, body, link)
      VALUES (
        _member.user_id,
        'Dokument zur Prüfung',
        NEW.name || ' für ' || COALESCE(_customer_name, 'Kunde') || ' wurde zur Prüfung eingereicht.',
        '/portal/customers'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_doc_submit_notify
  AFTER UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_customer_doc_submit();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- ─── client_customers ───────────────────────────────────────────────────

ALTER TABLE public.client_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_customers: admin select" ON public.client_customers
  FOR SELECT USING (public.is_admin());

CREATE POLICY "client_customers: admin insert" ON public.client_customers
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "client_customers: admin update" ON public.client_customers
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "client_customers: admin delete" ON public.client_customers
  FOR DELETE USING (public.is_admin());

CREATE POLICY "client_customers: client select own org" ON public.client_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = client_customers.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "client_customers: client editor insert" ON public.client_customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = client_customers.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

CREATE POLICY "client_customers: client editor update" ON public.client_customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = client_customers.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- ─── customer_documents ─────────────────────────────────────────────────

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_documents: admin select" ON public.customer_documents
  FOR SELECT USING (public.is_admin());

CREATE POLICY "customer_documents: admin insert" ON public.customer_documents
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "customer_documents: admin update" ON public.customer_documents
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "customer_documents: admin delete" ON public.customer_documents
  FOR DELETE USING (public.is_admin());

CREATE POLICY "customer_documents: client select own org" ON public.customer_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_documents.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "customer_documents: client editor insert" ON public.customer_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_documents.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

CREATE POLICY "customer_documents: client editor update" ON public.customer_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_documents.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- ─── customer_document_audit_log (immutable — only trigger writes) ─────

ALTER TABLE public.customer_document_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cust_doc_audit: admin select" ON public.customer_document_audit_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "cust_doc_audit: client select own org" ON public.customer_document_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_documents cd
      JOIN public.organization_members om ON om.organization_id = cd.organization_id
      WHERE cd.id = customer_document_audit_log.document_id AND om.user_id = auth.uid()
    )
  );

-- ─── customer_audit_log (immutable — only trigger writes) ──────────────

ALTER TABLE public.customer_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_audit: admin select" ON public.customer_audit_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "customer_audit: client select own org" ON public.customer_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_customers cc
      JOIN public.organization_members om ON om.organization_id = cc.organization_id
      WHERE cc.id = customer_audit_log.customer_id AND om.user_id = auth.uid()
    )
  );

-- ─── help_requests ──────────────────────────────────────────────────────

ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "help_requests: admin select" ON public.help_requests
  FOR SELECT USING (public.is_admin());

CREATE POLICY "help_requests: admin update" ON public.help_requests
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "help_requests: client select own org" ON public.help_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = help_requests.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "help_requests: client insert own org" ON public.help_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = help_requests.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- =============================================================================
-- CRON: check-customer-reviews daily at 07:00 UTC
-- =============================================================================

SELECT cron.schedule(
  'check-customer-reviews-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oylkwprbuaugndbzflvh.supabase.co/functions/v1/check-customer-reviews',
    -- NOTE: Applied with actual service_role_key. Placeholder below for Git safety.
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
