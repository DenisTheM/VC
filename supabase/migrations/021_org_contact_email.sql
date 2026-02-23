-- ============================================================================
-- 021: Add contact_email to organizations
-- ============================================================================
-- Stores the email of the responsible Compliance Officer for each organization.
-- Used for auto-invite as approver and for document approval notifications.
-- ============================================================================

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_email text;
