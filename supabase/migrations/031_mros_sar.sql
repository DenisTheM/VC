-- ============================================================================
-- 031: MROS Suspicious Activity Reports (SAR / Verdachtsmeldungen)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sar_reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id      uuid        REFERENCES public.client_customers(id),
  status           text        NOT NULL CHECK (status IN ('draft','review','submitted','archived')) DEFAULT 'draft',
  report_data      jsonb       NOT NULL DEFAULT '{}',
  goaml_xml        text,
  submitted_at     timestamptz,
  submitted_by     uuid        REFERENCES auth.users(id),
  reference_number text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sar_org
  ON public.sar_reports (organization_id);

-- RLS
ALTER TABLE public.sar_reports ENABLE ROW LEVEL SECURITY;

-- Admin: status only (no content — confidentiality)
CREATE POLICY "sar_reports: admin status only"
  ON public.sar_reports FOR SELECT
  USING (public.is_admin());

-- Org editors/approvers can manage their SARs
CREATE POLICY "sar_reports: org editors can manage"
  ON public.sar_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = sar_reports.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = sar_reports.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );
