-- ============================================================================
-- 033: AI Regulatory Change Interpreter
-- Adds AI interpretation columns to regulatory_alerts
-- ============================================================================

ALTER TABLE public.regulatory_alerts
  ADD COLUMN IF NOT EXISTS ai_interpretation jsonb,
  ADD COLUMN IF NOT EXISTS interpretation_model text,
  ADD COLUMN IF NOT EXISTS interpreted_at timestamptz;
