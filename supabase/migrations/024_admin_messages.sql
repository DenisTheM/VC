-- =============================================================================
-- 024: Admin Messages — direct messaging from admin to client organizations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject         text NOT NULL,
  body            text NOT NULL,
  sent_by         uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_messages: admin full access"
  ON public.admin_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Client members can read messages for their own organization
CREATE POLICY "admin_messages: client read own org"
  ON public.admin_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = admin_messages.organization_id
    )
  );

-- Index for fast lookup by org
CREATE INDEX IF NOT EXISTS idx_admin_messages_org
  ON public.admin_messages (organization_id, created_at DESC);
