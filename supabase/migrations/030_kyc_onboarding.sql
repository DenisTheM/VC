-- ============================================================================
-- 030: KYC Onboarding — Form A (natürliche Personen) / Form K (jurist. Personen)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kyc_cases (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id     uuid        REFERENCES public.client_customers(id),
  case_type       text        NOT NULL CHECK (case_type IN ('form_a','form_k')),
  status          text        NOT NULL CHECK (status IN ('draft','in_progress','review','completed','archived')) DEFAULT 'draft',
  form_data       jsonb       NOT NULL DEFAULT '{}',
  risk_category   text        CHECK (risk_category IN ('low','standard','elevated','high')),
  created_by      uuid        REFERENCES auth.users(id),
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_cases_org
  ON public.kyc_cases (organization_id);

CREATE INDEX IF NOT EXISTS idx_kyc_cases_status
  ON public.kyc_cases (status);

-- RLS
ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_cases: admin full access"
  ON public.kyc_cases FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "kyc_cases: org members can read"
  ON public.kyc_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = kyc_cases.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "kyc_cases: org editors can manage"
  ON public.kyc_cases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = kyc_cases.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = kyc_cases.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );
