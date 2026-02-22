-- =============================================================================
-- Migration 006: Regulatory Sources & AI-Powered Alert Drafts
-- Virtue Compliance GmbH
-- Created: 2026-02-22
--
-- Adds automated regulatory feed ingestion:
-- - regulatory_sources: Catalog of RSS/Atom feeds (FINMA, EBA, EUR-Lex, FATCA)
-- - feed_entries: Raw feed items with deduplication
-- - Extends regulatory_alerts with AI analysis fields
-- - Extends alert_affected_clients with AI-prepared fields
-- - Adds 'draft' and 'dismissed' status to regulatory_alerts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. regulatory_sources TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.regulatory_sources (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  region          text        NOT NULL,
  feed_url        text        NOT NULL,
  feed_type       text        NOT NULL DEFAULT 'rss',
  active          boolean     NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. feed_entries TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feed_entries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    uuid        NOT NULL REFERENCES public.regulatory_sources(id) ON DELETE CASCADE,
  guid         text        NOT NULL,
  title        text        NOT NULL,
  summary      text,
  link         text,
  published_at timestamptz,
  alert_id     uuid        REFERENCES public.regulatory_alerts(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, guid)
);

-- -----------------------------------------------------------------------------
-- 3. Extend regulatory_alerts: AI fields + new statuses
-- -----------------------------------------------------------------------------

-- Add AI analysis columns
ALTER TABLE public.regulatory_alerts
  ADD COLUMN IF NOT EXISTS feed_entry_id uuid REFERENCES public.feed_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_summary text,
  ADD COLUMN IF NOT EXISTS ai_legal_basis text,
  ADD COLUMN IF NOT EXISTS ai_severity text,
  ADD COLUMN IF NOT EXISTS ai_category text,
  ADD COLUMN IF NOT EXISTS ai_comment text,
  ADD COLUMN IF NOT EXISTS source_url text;

-- Update status check constraint to include 'draft' and 'dismissed'
ALTER TABLE public.regulatory_alerts DROP CONSTRAINT IF EXISTS regulatory_alerts_status_check;
ALTER TABLE public.regulatory_alerts
  ADD CONSTRAINT regulatory_alerts_status_check
  CHECK (status IN ('draft', 'new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'));

-- -----------------------------------------------------------------------------
-- 4. Extend alert_affected_clients: AI-prepared fields
-- -----------------------------------------------------------------------------

ALTER TABLE public.alert_affected_clients
  ADD COLUMN IF NOT EXISTS ai_risk text,
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS ai_elena_comment text;

-- -----------------------------------------------------------------------------
-- 5. RLS Policies
-- -----------------------------------------------------------------------------

-- ── regulatory_sources ──

ALTER TABLE public.regulatory_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regulatory_sources: admin can select"
  ON public.regulatory_sources FOR SELECT
  USING (public.is_admin());

CREATE POLICY "regulatory_sources: admin can insert"
  ON public.regulatory_sources FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "regulatory_sources: admin can update"
  ON public.regulatory_sources FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "regulatory_sources: admin can delete"
  ON public.regulatory_sources FOR DELETE
  USING (public.is_admin());

-- ── feed_entries ──

ALTER TABLE public.feed_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_entries: admin can select"
  ON public.feed_entries FOR SELECT
  USING (public.is_admin());

CREATE POLICY "feed_entries: admin can insert"
  ON public.feed_entries FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "feed_entries: admin can update"
  ON public.feed_entries FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "feed_entries: admin can delete"
  ON public.feed_entries FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. Seed: Initial regulatory sources
-- -----------------------------------------------------------------------------

INSERT INTO public.regulatory_sources (name, region, feed_url, feed_type) VALUES
  ('FINMA',     'CH', 'https://www.finma.ch/de/rss/news/',           'rss'),
  ('EBA',       'EU', 'https://www.eba.europa.eu/news-press/news/rss.xml', 'rss'),
  ('EUR-Lex',   'EU', 'https://eur-lex.europa.eu/EN/display-feed.html',    'atom'),
  ('IRS/FATCA', 'US', 'https://www.irs.gov/newsroom',                      'html');
