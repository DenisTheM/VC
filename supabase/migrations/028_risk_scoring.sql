-- ============================================================================
-- 028: Configurable Risk Scoring
-- Risk scoring profiles per SRO + per-customer risk scores
-- ============================================================================

-- Risk scoring configuration per SRO
CREATE TABLE IF NOT EXISTS public.risk_scoring_profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sro             text        NOT NULL,
  name            text        NOT NULL DEFAULT 'Standard',
  weights         jsonb       NOT NULL DEFAULT '{"country":25,"industry":15,"pep":20,"products":15,"volume":10,"source_of_funds":15}',
  country_risk_map jsonb      NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sro, name)
);

-- Per-customer risk scores
CREATE TABLE IF NOT EXISTS public.customer_risk_scores (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid        NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  overall_score   integer     CHECK (overall_score BETWEEN 0 AND 100),
  risk_level      text        CHECK (risk_level IN ('low','standard','elevated','high')),
  factors         jsonb       NOT NULL DEFAULT '{}',
  calculated_at   timestamptz NOT NULL DEFAULT now(),
  calculated_by   uuid        REFERENCES auth.users(id),
  UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_org
  ON public.customer_risk_scores (organization_id);

-- Seed: Default profiles for major SROs
INSERT INTO public.risk_scoring_profiles (sro, name, weights, country_risk_map) VALUES
  ('VQF', 'Standard',
   '{"country":25,"industry":15,"pep":20,"products":15,"volume":10,"source_of_funds":15}',
   '{"IR":90,"KP":95,"MM":85,"SY":90,"AF":85,"YE":80,"LY":80,"SD":80,"SO":85,"IQ":75,"VE":70,"NI":65,"PK":65,"HT":70,"KH":60,"ML":65,"GW":65,"MZ":65,"UG":60,"ZW":60,"CD":70,"CF":70,"SS":75}'
  ),
  ('PolyReg', 'Standard',
   '{"country":25,"industry":15,"pep":20,"products":15,"volume":10,"source_of_funds":15}',
   '{"IR":90,"KP":95,"MM":85,"SY":90,"AF":85,"YE":80,"LY":80,"SD":80,"SO":85,"IQ":75,"VE":70,"NI":65,"PK":65}'
  ),
  ('ARIF', 'Standard',
   '{"country":25,"industry":15,"pep":20,"products":15,"volume":10,"source_of_funds":15}',
   '{"IR":90,"KP":95,"MM":85,"SY":90,"AF":85,"YE":80,"LY":80,"SD":80}'
  ),
  ('SO-FIT', 'Standard',
   '{"country":25,"industry":15,"pep":20,"products":15,"volume":10,"source_of_funds":15}',
   '{"IR":90,"KP":95,"MM":85,"SY":90,"AF":85}'
  )
ON CONFLICT (sro, name) DO NOTHING;

-- RLS
ALTER TABLE public.risk_scoring_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_risk_scores ENABLE ROW LEVEL SECURITY;

-- Admin can manage risk profiles
CREATE POLICY "risk_scoring_profiles: admin full access"
  ON public.risk_scoring_profiles FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin can manage all scores
CREATE POLICY "customer_risk_scores: admin full access"
  ON public.customer_risk_scores FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Org members can read their own org's scores
CREATE POLICY "customer_risk_scores: org members can read"
  ON public.customer_risk_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_risk_scores.organization_id
        AND om.user_id = auth.uid()
    )
  );
