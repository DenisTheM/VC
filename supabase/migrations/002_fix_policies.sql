-- =============================================================================
-- Migration 002: Fix - Drop all existing policies and recreate
-- Run this if 001 partially failed due to existing policies
-- =============================================================================

-- =============================================================================
-- DROP ALL EXISTING POLICIES
-- =============================================================================

-- profiles
DROP POLICY IF EXISTS "profiles: users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can read all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can update" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can update own profile" ON public.profiles;

-- organizations
DROP POLICY IF EXISTS "organizations: admin can select" ON public.organizations;
DROP POLICY IF EXISTS "organizations: admin can insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations: admin can update" ON public.organizations;
DROP POLICY IF EXISTS "organizations: admin can delete" ON public.organizations;
DROP POLICY IF EXISTS "organizations: clients can read own org" ON public.organizations;

-- organization_members
DROP POLICY IF EXISTS "organization_members: admin can select" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: admin can insert" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: admin can update" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: admin can delete" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: users can read own memberships" ON public.organization_members;

-- company_profiles
DROP POLICY IF EXISTS "company_profiles: admin can select" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: admin can insert" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: admin can update" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: admin can delete" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: clients can read own org" ON public.company_profiles;

-- documents
DROP POLICY IF EXISTS "documents: admin can select" ON public.documents;
DROP POLICY IF EXISTS "documents: admin can insert" ON public.documents;
DROP POLICY IF EXISTS "documents: admin can update" ON public.documents;
DROP POLICY IF EXISTS "documents: admin can delete" ON public.documents;
DROP POLICY IF EXISTS "documents: clients can read own org docs" ON public.documents;

-- regulatory_alerts
DROP POLICY IF EXISTS "regulatory_alerts: admin can select" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: admin can insert" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: admin can update" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: admin can delete" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: clients can read alerts affecting their org" ON public.regulatory_alerts;

-- alert_action_items
DROP POLICY IF EXISTS "alert_action_items: admin can select" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: admin can insert" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: admin can update" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: admin can delete" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: clients can read for their org" ON public.alert_action_items;

-- alert_affected_clients
DROP POLICY IF EXISTS "alert_affected_clients: admin can select" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: admin can insert" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: admin can update" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: admin can delete" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: clients can read own org" ON public.alert_affected_clients;

-- client_alert_actions
DROP POLICY IF EXISTS "client_alert_actions: admin can select" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: admin can insert" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: admin can update" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: admin can delete" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: clients can read for their org" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: clients can update for their org" ON public.client_alert_actions;

-- alert_related_documents
DROP POLICY IF EXISTS "alert_related_documents: admin can select" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: admin can insert" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: admin can update" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: admin can delete" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: clients can read for their org" ON public.alert_related_documents;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_affected_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_alert_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_related_documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RECREATE ALL POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

CREATE POLICY "profiles: users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: admin can read all"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles: admin can insert"
  ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles: admin can update"
  ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles: admin can delete"
  ON public.profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles: users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

CREATE POLICY "organizations: admin can select"
  ON public.organizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organizations: admin can insert"
  ON public.organizations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organizations: admin can update"
  ON public.organizations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organizations: admin can delete"
  ON public.organizations FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organizations: clients can read own org"
  ON public.organizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = organizations.id
  ));

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------

CREATE POLICY "organization_members: admin can select"
  ON public.organization_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organization_members: admin can insert"
  ON public.organization_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organization_members: admin can update"
  ON public.organization_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organization_members: admin can delete"
  ON public.organization_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "organization_members: users can read own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- company_profiles
-- -----------------------------------------------------------------------------

CREATE POLICY "company_profiles: admin can select"
  ON public.company_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "company_profiles: admin can insert"
  ON public.company_profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "company_profiles: admin can update"
  ON public.company_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "company_profiles: admin can delete"
  ON public.company_profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "company_profiles: clients can read own org"
  ON public.company_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = company_profiles.organization_id
  ));

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------

CREATE POLICY "documents: admin can select"
  ON public.documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "documents: admin can insert"
  ON public.documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "documents: admin can update"
  ON public.documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "documents: admin can delete"
  ON public.documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "documents: clients can read own org docs"
  ON public.documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = documents.organization_id
  ));

-- -----------------------------------------------------------------------------
-- regulatory_alerts
-- -----------------------------------------------------------------------------

CREATE POLICY "regulatory_alerts: admin can select"
  ON public.regulatory_alerts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "regulatory_alerts: admin can insert"
  ON public.regulatory_alerts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "regulatory_alerts: admin can update"
  ON public.regulatory_alerts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "regulatory_alerts: admin can delete"
  ON public.regulatory_alerts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "regulatory_alerts: clients can read alerts affecting their org"
  ON public.regulatory_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.alert_affected_clients aac
    JOIN public.organization_members om ON om.organization_id = aac.organization_id
    WHERE aac.alert_id = regulatory_alerts.id AND om.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- alert_action_items
-- -----------------------------------------------------------------------------

CREATE POLICY "alert_action_items: admin can select"
  ON public.alert_action_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_action_items: admin can insert"
  ON public.alert_action_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_action_items: admin can update"
  ON public.alert_action_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_action_items: admin can delete"
  ON public.alert_action_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_action_items: clients can read for their org"
  ON public.alert_action_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.alert_affected_clients aac
    JOIN public.organization_members om ON om.organization_id = aac.organization_id
    WHERE aac.alert_id = alert_action_items.alert_id AND om.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- alert_affected_clients
-- -----------------------------------------------------------------------------

CREATE POLICY "alert_affected_clients: admin can select"
  ON public.alert_affected_clients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_affected_clients: admin can insert"
  ON public.alert_affected_clients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_affected_clients: admin can update"
  ON public.alert_affected_clients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_affected_clients: admin can delete"
  ON public.alert_affected_clients FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_affected_clients: clients can read own org"
  ON public.alert_affected_clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = alert_affected_clients.organization_id
  ));

-- -----------------------------------------------------------------------------
-- client_alert_actions
-- -----------------------------------------------------------------------------

CREATE POLICY "client_alert_actions: admin can select"
  ON public.client_alert_actions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "client_alert_actions: admin can insert"
  ON public.client_alert_actions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "client_alert_actions: admin can update"
  ON public.client_alert_actions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "client_alert_actions: admin can delete"
  ON public.client_alert_actions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "client_alert_actions: clients can read for their org"
  ON public.client_alert_actions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.alert_affected_clients aac
    JOIN public.organization_members om ON om.organization_id = aac.organization_id
    WHERE aac.id = client_alert_actions.alert_affected_client_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "client_alert_actions: clients can update for their org"
  ON public.client_alert_actions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.alert_affected_clients aac
    JOIN public.organization_members om ON om.organization_id = aac.organization_id
    WHERE aac.id = client_alert_actions.alert_affected_client_id AND om.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- alert_related_documents
-- -----------------------------------------------------------------------------

CREATE POLICY "alert_related_documents: admin can select"
  ON public.alert_related_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_related_documents: admin can insert"
  ON public.alert_related_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_related_documents: admin can update"
  ON public.alert_related_documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_related_documents: admin can delete"
  ON public.alert_related_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "alert_related_documents: clients can read for their org"
  ON public.alert_related_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.alert_affected_clients aac
    JOIN public.organization_members om ON om.organization_id = aac.organization_id
    WHERE aac.id = alert_related_documents.alert_affected_client_id AND om.user_id = auth.uid()
  ));
