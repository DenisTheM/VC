-- =============================================================================
-- Migration 003: Fix infinite recursion in profiles RLS policies
-- Problem: Admin policies on profiles table query profiles table → recursion
-- Fix: Use SECURITY DEFINER function that bypasses RLS
-- =============================================================================

-- Helper function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================================================
-- DROP old profiles policies (the ones causing recursion)
-- =============================================================================

DROP POLICY IF EXISTS "profiles: users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can read all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can update" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can update own profile" ON public.profiles;

-- =============================================================================
-- Recreate profiles policies using is_admin() function
-- =============================================================================

CREATE POLICY "profiles: users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: admin can read all"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles: admin can insert"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles: admin can update"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "profiles: admin can delete"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

CREATE POLICY "profiles: users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- =============================================================================
-- Also update all other tables' admin policies to use is_admin()
-- (not strictly necessary but consistent and more performant)
-- =============================================================================

-- organizations
DROP POLICY IF EXISTS "organizations: admin can select" ON public.organizations;
DROP POLICY IF EXISTS "organizations: admin can insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations: admin can update" ON public.organizations;
DROP POLICY IF EXISTS "organizations: admin can delete" ON public.organizations;

CREATE POLICY "organizations: admin can select"
  ON public.organizations FOR SELECT USING (public.is_admin());
CREATE POLICY "organizations: admin can insert"
  ON public.organizations FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "organizations: admin can update"
  ON public.organizations FOR UPDATE USING (public.is_admin());
CREATE POLICY "organizations: admin can delete"
  ON public.organizations FOR DELETE USING (public.is_admin());

-- organization_members
DROP POLICY IF EXISTS "organization_members: admin can select" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: admin can insert" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: admin can update" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members: admin can delete" ON public.organization_members;

CREATE POLICY "organization_members: admin can select"
  ON public.organization_members FOR SELECT USING (public.is_admin());
CREATE POLICY "organization_members: admin can insert"
  ON public.organization_members FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "organization_members: admin can update"
  ON public.organization_members FOR UPDATE USING (public.is_admin());
CREATE POLICY "organization_members: admin can delete"
  ON public.organization_members FOR DELETE USING (public.is_admin());

-- company_profiles
DROP POLICY IF EXISTS "company_profiles: admin can select" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: admin can insert" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: admin can update" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles: admin can delete" ON public.company_profiles;

CREATE POLICY "company_profiles: admin can select"
  ON public.company_profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "company_profiles: admin can insert"
  ON public.company_profiles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "company_profiles: admin can update"
  ON public.company_profiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "company_profiles: admin can delete"
  ON public.company_profiles FOR DELETE USING (public.is_admin());

-- documents
DROP POLICY IF EXISTS "documents: admin can select" ON public.documents;
DROP POLICY IF EXISTS "documents: admin can insert" ON public.documents;
DROP POLICY IF EXISTS "documents: admin can update" ON public.documents;
DROP POLICY IF EXISTS "documents: admin can delete" ON public.documents;

CREATE POLICY "documents: admin can select"
  ON public.documents FOR SELECT USING (public.is_admin());
CREATE POLICY "documents: admin can insert"
  ON public.documents FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "documents: admin can update"
  ON public.documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "documents: admin can delete"
  ON public.documents FOR DELETE USING (public.is_admin());

-- regulatory_alerts
DROP POLICY IF EXISTS "regulatory_alerts: admin can select" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: admin can insert" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: admin can update" ON public.regulatory_alerts;
DROP POLICY IF EXISTS "regulatory_alerts: admin can delete" ON public.regulatory_alerts;

CREATE POLICY "regulatory_alerts: admin can select"
  ON public.regulatory_alerts FOR SELECT USING (public.is_admin());
CREATE POLICY "regulatory_alerts: admin can insert"
  ON public.regulatory_alerts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "regulatory_alerts: admin can update"
  ON public.regulatory_alerts FOR UPDATE USING (public.is_admin());
CREATE POLICY "regulatory_alerts: admin can delete"
  ON public.regulatory_alerts FOR DELETE USING (public.is_admin());

-- alert_action_items
DROP POLICY IF EXISTS "alert_action_items: admin can select" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: admin can insert" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: admin can update" ON public.alert_action_items;
DROP POLICY IF EXISTS "alert_action_items: admin can delete" ON public.alert_action_items;

CREATE POLICY "alert_action_items: admin can select"
  ON public.alert_action_items FOR SELECT USING (public.is_admin());
CREATE POLICY "alert_action_items: admin can insert"
  ON public.alert_action_items FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "alert_action_items: admin can update"
  ON public.alert_action_items FOR UPDATE USING (public.is_admin());
CREATE POLICY "alert_action_items: admin can delete"
  ON public.alert_action_items FOR DELETE USING (public.is_admin());

-- alert_affected_clients
DROP POLICY IF EXISTS "alert_affected_clients: admin can select" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: admin can insert" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: admin can update" ON public.alert_affected_clients;
DROP POLICY IF EXISTS "alert_affected_clients: admin can delete" ON public.alert_affected_clients;

CREATE POLICY "alert_affected_clients: admin can select"
  ON public.alert_affected_clients FOR SELECT USING (public.is_admin());
CREATE POLICY "alert_affected_clients: admin can insert"
  ON public.alert_affected_clients FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "alert_affected_clients: admin can update"
  ON public.alert_affected_clients FOR UPDATE USING (public.is_admin());
CREATE POLICY "alert_affected_clients: admin can delete"
  ON public.alert_affected_clients FOR DELETE USING (public.is_admin());

-- client_alert_actions
DROP POLICY IF EXISTS "client_alert_actions: admin can select" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: admin can insert" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: admin can update" ON public.client_alert_actions;
DROP POLICY IF EXISTS "client_alert_actions: admin can delete" ON public.client_alert_actions;

CREATE POLICY "client_alert_actions: admin can select"
  ON public.client_alert_actions FOR SELECT USING (public.is_admin());
CREATE POLICY "client_alert_actions: admin can insert"
  ON public.client_alert_actions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "client_alert_actions: admin can update"
  ON public.client_alert_actions FOR UPDATE USING (public.is_admin());
CREATE POLICY "client_alert_actions: admin can delete"
  ON public.client_alert_actions FOR DELETE USING (public.is_admin());

-- alert_related_documents
DROP POLICY IF EXISTS "alert_related_documents: admin can select" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: admin can insert" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: admin can update" ON public.alert_related_documents;
DROP POLICY IF EXISTS "alert_related_documents: admin can delete" ON public.alert_related_documents;

CREATE POLICY "alert_related_documents: admin can select"
  ON public.alert_related_documents FOR SELECT USING (public.is_admin());
CREATE POLICY "alert_related_documents: admin can insert"
  ON public.alert_related_documents FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "alert_related_documents: admin can update"
  ON public.alert_related_documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "alert_related_documents: admin can delete"
  ON public.alert_related_documents FOR DELETE USING (public.is_admin());
