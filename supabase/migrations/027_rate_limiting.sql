-- ============================================================================
-- 027: Rate Limiting
-- IP-based rate limiting log for Edge Functions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   inet        NOT NULL,
  endpoint     text        NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON public.rate_limit_log (ip_address, endpoint, requested_at);

-- Auto-cleanup: delete entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_log
  WHERE requested_at < now() - INTERVAL '1 hour';
$$;
