-- ============================================================================
-- 035: LETA Transparenzregister (UBO Declarations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ubo_declarations (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        uuid        NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  organization_id    uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ubo_data           jsonb       NOT NULL DEFAULT '[]',
  leta_status        text        CHECK (leta_status IN ('not_checked','matched','discrepancy','pending_report','reported')) DEFAULT 'not_checked',
  leta_check_date    timestamptz,
  leta_response      jsonb,
  discrepancy_details text,
  report_deadline    timestamptz,
  reported_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ubo_customer
  ON public.ubo_declarations (customer_id);

CREATE INDEX IF NOT EXISTS idx_ubo_discrepancy
  ON public.ubo_declarations (leta_status)
  WHERE leta_status = 'discrepancy';

-- RLS
ALTER TABLE public.ubo_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ubo_declarations: admin full access"
  ON public.ubo_declarations FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ubo_declarations: org members can read"
  ON public.ubo_declarations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ubo_declarations.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "ubo_declarations: org editors can manage"
  ON public.ubo_declarations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ubo_declarations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ubo_declarations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );
