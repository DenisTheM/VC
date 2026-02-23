-- ============================================================================
-- 014: Multi-User Roles — viewer, editor, approver
-- ============================================================================
-- Extends organization_members.role from generic 'member' to granular roles:
--   viewer   — read-only access
--   editor   — can update action statuses
--   approver — can approve documents + everything editor can do
-- ============================================================================

-- 1. Helper function: get current user's role within an organization
CREATE OR REPLACE FUNCTION public.get_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = auth.uid()
    AND organization_id = p_org_id
  LIMIT 1;
$$;

-- 2. Migrate existing 'member' rows to 'editor' (backwards-compatible default)
UPDATE public.organization_members
  SET role = 'editor'
  WHERE role = 'member';

-- 3. Add CHECK constraint for allowed roles
--    Drop any old constraint first (safe idempotent)
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('viewer', 'editor', 'approver'));

-- 4. Update default for new members
ALTER TABLE public.organization_members
  ALTER COLUMN role SET DEFAULT 'editor';

-- 5. Tighten document approval RLS — only approvers can approve
--    Drop old permissive policy (any org member could approve)
DROP POLICY IF EXISTS "documents: clients can approve own org docs"
  ON public.documents;

CREATE POLICY "documents: approvers can approve own org docs"
  ON public.documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = documents.organization_id
        AND role = 'approver'
    )
    AND documents.status = 'review'
  )
  WITH CHECK (
    status = 'current'
  );

-- 6. Tighten client_alert_actions update — only editor/approver
--    Drop old permissive policy (any org member could toggle status)
DROP POLICY IF EXISTS "client_alert_actions: clients can update own org"
  ON public.client_alert_actions;

CREATE POLICY "client_alert_actions: editor/approver can update"
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
        AND om.role IN ('editor', 'approver')
    )
  );
