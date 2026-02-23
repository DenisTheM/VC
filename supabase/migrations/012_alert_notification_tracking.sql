-- ============================================================================
-- 012: E-Mail-Tracking bei Alert-Veröffentlichung
-- ============================================================================

-- 1. Tracking-Spalten auf alert_affected_clients
ALTER TABLE public.alert_affected_clients
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_status text DEFAULT NULL
    CHECK (notification_status IN ('sent', 'partial', 'failed'));

-- 2. Notification Log — Detailliertes Email-Protokoll
CREATE TABLE IF NOT EXISTS public.alert_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.regulatory_alerts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Index für schnelles Laden pro Alert
CREATE INDEX IF NOT EXISTS idx_notification_log_alert
  ON public.alert_notification_log(alert_id, sent_at DESC);

-- 3. RLS: nur Admin kann lesen
ALTER TABLE public.alert_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin kann Notification Log lesen"
  ON public.alert_notification_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Service Role kann immer schreiben (Edge Functions)
CREATE POLICY "Service Role kann Notification Log schreiben"
  ON public.alert_notification_log
  FOR INSERT
  WITH CHECK (true);
