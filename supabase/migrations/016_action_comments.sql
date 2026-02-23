-- ============================================================================
-- 016: Comments on Client Alert Actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.action_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id   uuid        NOT NULL REFERENCES public.client_alert_actions(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

-- Admin can read all comments
CREATE POLICY "action_comments: admin can read all"
  ON public.action_comments
  FOR SELECT
  USING (public.is_admin());

-- Clients can read comments on their org's actions
CREATE POLICY "action_comments: clients can read own org"
  ON public.action_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_alert_actions caa
      JOIN public.alert_affected_clients aac
        ON aac.id = caa.alert_affected_client_id
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE caa.id = action_comments.action_id
        AND om.user_id = auth.uid()
    )
  );

-- Clients can insert comments on their org's actions (editor/approver)
CREATE POLICY "action_comments: editor/approver can insert"
  ON public.action_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.client_alert_actions caa
      JOIN public.alert_affected_clients aac
        ON aac.id = caa.alert_affected_client_id
      JOIN public.organization_members om
        ON om.organization_id = aac.organization_id
      WHERE caa.id = action_comments.action_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- Clients can delete their own comments
CREATE POLICY "action_comments: users can delete own"
  ON public.action_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_action_comments_action
  ON public.action_comments (action_id, created_at);
