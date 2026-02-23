-- ============================================================================
-- 015: In-App Notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('new_alert', 'action_due', 'doc_approved', 'doc_updated')),
  title       text        NOT NULL,
  body        text,
  link        text,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "notifications: users can read own"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications: users can update own"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Admin can read all notifications
CREATE POLICY "notifications: admin can read all"
  ON public.notifications
  FOR SELECT
  USING (public.is_admin());

-- Service role can insert (from Edge Functions / triggers)
-- (service_role bypasses RLS, so no policy needed for insert)

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read = false;

-- ============================================================================
-- Trigger: Create notification on document approval (status review → current)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_on_doc_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes from 'review' to 'current'
  IF OLD.status = 'review' AND NEW.status = 'current' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      om.user_id,
      'doc_approved',
      'Dokument freigegeben',
      'Das Dokument "' || NEW.name || '" wurde freigegeben.',
      '/portal/docs'
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doc_approval ON public.documents;
CREATE TRIGGER trg_notify_doc_approval
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_doc_approval();
