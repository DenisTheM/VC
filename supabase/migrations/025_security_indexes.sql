-- =============================================================================
-- Migration 025: Security fixes + Performance indexes
-- Fixes: S7 (role escalation), D1 (missing indexes), D4 (unique constraint)
-- =============================================================================

-- S7: Prevent users from escalating their own role via profiles UPDATE policy
-- The existing policy "profiles: users can update own profile" allows updating
-- any column including 'role' and 'organization_id'. This trigger blocks that.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only restrict non-admin users
  IF NOT public.is_admin() THEN
    -- Prevent changing role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change own role';
    END IF;
    -- Prevent changing organization_id
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'Cannot change own organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- D1: Performance indexes for RLS policy evaluation and common queries
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON public.documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_affected_clients_alert ON public.alert_affected_clients(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_affected_clients_org ON public.alert_affected_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_status ON public.regulatory_alerts(status);
CREATE INDEX IF NOT EXISTS idx_client_alert_actions_affected ON public.client_alert_actions(alert_affected_client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
-- D4: Ensure one company_profile per organization
-- First, remove duplicates if any exist (keep the latest)
DELETE FROM public.company_profiles a
  USING public.company_profiles b
  WHERE a.organization_id = b.organization_id
    AND a.updated_at < b.updated_at;

-- Then add the unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_profiles_organization_id_unique'
  ) THEN
    ALTER TABLE public.company_profiles
      ADD CONSTRAINT company_profiles_organization_id_unique UNIQUE (organization_id);
  END IF;
END $$;
