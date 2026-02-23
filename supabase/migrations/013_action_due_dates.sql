-- ============================================================================
-- 013: Fälligkeits-Erinnerungen — strukturierte Fristdaten + Reminder-Flags
-- ============================================================================

-- 1. Strukturiertes Datum neben dem Freitext-Feld
ALTER TABLE public.client_alert_actions
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS reminder_sent_7d boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_0d boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_overdue boolean NOT NULL DEFAULT false;

-- 2. Index für die Cron-Abfrage (offene Actions mit Frist)
CREATE INDEX IF NOT EXISTS idx_client_actions_due
  ON public.client_alert_actions(due_date)
  WHERE status != 'erledigt' AND due_date IS NOT NULL;
