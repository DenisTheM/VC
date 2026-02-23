-- ============================================================================
-- 022: Leads-Tabelle für Checklisten-Downloads & Lead-Magnets
-- ============================================================================

CREATE TABLE public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source      text NOT NULL DEFAULT 'sro-checklist',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_email  ON public.leads (email);
CREATE INDEX idx_leads_source ON public.leads (source);

-- RLS: nur Admin kann lesen
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin kann Leads lesen"
  ON public.leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Service Role kann schreiben (Edge Functions)
CREATE POLICY "Service Role kann Leads schreiben"
  ON public.leads
  FOR INSERT
  WITH CHECK (true);
