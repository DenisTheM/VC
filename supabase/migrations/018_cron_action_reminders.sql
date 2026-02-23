-- 018: Cron-Job für tägliche Fälligkeits-Erinnerungen
-- Ruft die Edge Function check-action-reminders täglich um 07:00 UTC (08:00 CET) auf.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

SELECT cron.schedule(
  'check-action-reminders-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oylkwprbuaugndbzflvh.supabase.co/functions/v1/check-action-reminders',
    -- NOTE: Applied with actual service_role_key. Placeholder below for Git safety.
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
