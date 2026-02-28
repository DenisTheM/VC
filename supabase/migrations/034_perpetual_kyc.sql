-- ============================================================================
-- 034: Perpetual KYC (pKYC)
-- Trigger-based continuous monitoring for customer KYC
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pkyc_triggers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid        NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_type    text        NOT NULL CHECK (trigger_type IN ('sanctions_hit','adverse_media','registry_change','transaction_anomaly','review_due','manual')),
  severity        text        NOT NULL CHECK (severity IN ('info','warning','critical')) DEFAULT 'info',
  description     text        NOT NULL,
  source_data     jsonb       DEFAULT '{}',
  status          text        NOT NULL CHECK (status IN ('new','investigating','resolved','dismissed')) DEFAULT 'new',
  resolved_by     uuid        REFERENCES auth.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pkyc_customer
  ON public.pkyc_triggers (customer_id);

CREATE INDEX IF NOT EXISTS idx_pkyc_org_status
  ON public.pkyc_triggers (organization_id, status);

-- Monitoring configuration per organization
CREATE TABLE IF NOT EXISTS public.pkyc_monitoring_config (
  organization_id         uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  sanctions_monitoring    boolean DEFAULT true,
  adverse_media_monitoring boolean DEFAULT false,
  registry_monitoring     boolean DEFAULT true,
  review_cycle_months     integer DEFAULT 12,
  auto_screening_interval_days integer DEFAULT 30,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pkyc_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkyc_monitoring_config ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "pkyc_triggers: admin full access"
  ON public.pkyc_triggers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "pkyc_monitoring_config: admin full access"
  ON public.pkyc_monitoring_config FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Org members can read triggers
CREATE POLICY "pkyc_triggers: org members can read"
  ON public.pkyc_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pkyc_triggers.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Org editors can update triggers (resolve/dismiss)
CREATE POLICY "pkyc_triggers: org editors can update"
  ON public.pkyc_triggers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pkyc_triggers.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- Org members can read/update their monitoring config
CREATE POLICY "pkyc_monitoring_config: org members can read"
  ON public.pkyc_monitoring_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pkyc_monitoring_config.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "pkyc_monitoring_config: org editors can manage"
  ON public.pkyc_monitoring_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pkyc_monitoring_config.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pkyc_monitoring_config.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );
