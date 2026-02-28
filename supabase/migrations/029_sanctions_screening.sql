-- ============================================================================
-- 029: Sanctions / PEP Screening
-- Screening results for OpenSanctions integration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.screening_results (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid        NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  screening_type    text        NOT NULL CHECK (screening_type IN ('sanctions','pep','adverse_media')),
  query_name        text        NOT NULL,
  query_date_of_birth text,
  query_nationality text,
  source            text        NOT NULL DEFAULT 'opensanctions',
  status            text        NOT NULL CHECK (status IN ('clear','potential_match','confirmed_match','false_positive')) DEFAULT 'clear',
  matches           jsonb       NOT NULL DEFAULT '[]',
  reviewed_by       uuid        REFERENCES auth.users(id),
  reviewed_at       timestamptz,
  notes             text,
  screened_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_customer
  ON public.screening_results (customer_id);

CREATE INDEX IF NOT EXISTS idx_screening_org
  ON public.screening_results (organization_id);

CREATE INDEX IF NOT EXISTS idx_screening_status
  ON public.screening_results (status)
  WHERE status = 'potential_match';

-- RLS
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

-- Admin can manage all screening results
CREATE POLICY "screening_results: admin full access"
  ON public.screening_results FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Org members can read their org's screening results
CREATE POLICY "screening_results: org members can read"
  ON public.screening_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = screening_results.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Org editors/approvers can insert screening results
CREATE POLICY "screening_results: org editors can insert"
  ON public.screening_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = screening_results.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- Org editors/approvers can update (review) screening results
CREATE POLICY "screening_results: org editors can update"
  ON public.screening_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = screening_results.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );
