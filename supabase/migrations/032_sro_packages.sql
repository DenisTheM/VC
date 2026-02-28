-- ============================================================================
-- 032: SRO-specific Compliance Packages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sro_compliance_packages (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sro                text        NOT NULL,
  name               text        NOT NULL,
  description        text,
  checklist          jsonb       NOT NULL DEFAULT '[]',
  document_templates text[]      DEFAULT '{}',
  review_cycle_months integer    DEFAULT 12,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sro, name)
);

CREATE TABLE IF NOT EXISTS public.organization_checklist_progress (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id       uuid        NOT NULL REFERENCES public.sro_compliance_packages(id),
  checklist_status jsonb       NOT NULL DEFAULT '{}',
  last_updated     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, package_id)
);

-- RLS
ALTER TABLE public.sro_compliance_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Everyone can read packages (reference data)
CREATE POLICY "sro_compliance_packages: public read"
  ON public.sro_compliance_packages FOR SELECT
  USING (true);

-- Admin can manage packages
CREATE POLICY "sro_compliance_packages: admin manage"
  ON public.sro_compliance_packages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Org members can read their progress
CREATE POLICY "checklist_progress: org members can read"
  ON public.organization_checklist_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_checklist_progress.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Org editors can manage progress
CREATE POLICY "checklist_progress: org editors can manage"
  ON public.organization_checklist_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_checklist_progress.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_checklist_progress.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- Admin can manage all progress
CREATE POLICY "checklist_progress: admin manage"
  ON public.organization_checklist_progress FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed: VQF, PolyReg, ARIF packages
INSERT INTO public.sro_compliance_packages (sro, name, description, checklist, document_templates, review_cycle_months) VALUES
  ('VQF', 'Basis-Paket', 'VQF Compliance-Grundpaket für Finanzintermediäre',
   '[{"id":"vqf_1","text":"AML-Richtlinie aktuell und genehmigt","category":"Dokumente","required":true},{"id":"vqf_2","text":"KYC-Checkliste vorhanden","category":"Dokumente","required":true},{"id":"vqf_3","text":"Risikoanalyse durchgeführt","category":"Dokumente","required":true},{"id":"vqf_4","text":"KYT-Richtlinie erstellt","category":"Dokumente","required":true},{"id":"vqf_5","text":"Jahresbericht eingereicht","category":"Dokumente","required":true},{"id":"vqf_6","text":"Kundenidentifikation dokumentiert","category":"Prozesse","required":true},{"id":"vqf_7","text":"Transaktionsüberwachung implementiert","category":"Prozesse","required":true},{"id":"vqf_8","text":"Verdachtsmeldungsprozess definiert","category":"Prozesse","required":true},{"id":"vqf_9","text":"Mitarbeiterschulung durchgeführt","category":"Schulung","required":true},{"id":"vqf_10","text":"Schulungsnachweis archiviert","category":"Schulung","required":true},{"id":"vqf_11","text":"Jahresrevision geplant","category":"Fristen","required":true},{"id":"vqf_12","text":"Dokumente fristgerecht aktualisiert","category":"Fristen","required":true},{"id":"vqf_13","text":"Prüfbereite Unterlagen zusammengestellt","category":"Audit","required":false},{"id":"vqf_14","text":"Mängelbeseitigung aus letzter Prüfung","category":"Audit","required":false},{"id":"vqf_15","text":"Compliance-Officer designiert","category":"Organisation","required":true}]',
   '{"aml_policy","kyc_checklist","risk_assessment","kyt_policy","annual_report"}',
   12),
  ('PolyReg', 'Basis-Paket', 'PolyReg Compliance-Grundpaket',
   '[{"id":"pr_1","text":"AML-Richtlinie aktuell","category":"Dokumente","required":true},{"id":"pr_2","text":"KYC-Checkliste vorhanden","category":"Dokumente","required":true},{"id":"pr_3","text":"Risikoanalyse durchgeführt","category":"Dokumente","required":true},{"id":"pr_4","text":"Kundenidentifikation dokumentiert","category":"Prozesse","required":true},{"id":"pr_5","text":"Transaktionsüberwachung aktiv","category":"Prozesse","required":true},{"id":"pr_6","text":"Verdachtsmeldungsprozess definiert","category":"Prozesse","required":true},{"id":"pr_7","text":"Schulung durchgeführt","category":"Schulung","required":true},{"id":"pr_8","text":"Jahresbericht erstellt","category":"Fristen","required":true},{"id":"pr_9","text":"Dokumente aktualisiert","category":"Fristen","required":true},{"id":"pr_10","text":"Prüfunterlagen bereit","category":"Audit","required":false},{"id":"pr_11","text":"Compliance-Officer bestimmt","category":"Organisation","required":true},{"id":"pr_12","text":"Organigramm aktuell","category":"Organisation","required":false}]',
   '{"aml_policy","kyc_checklist","risk_assessment"}',
   12),
  ('ARIF', 'Basis-Paket', 'ARIF Compliance-Grundpaket',
   '[{"id":"ar_1","text":"AML-Richtlinie aktuell","category":"Dokumente","required":true},{"id":"ar_2","text":"Risikoanalyse durchgeführt","category":"Dokumente","required":true},{"id":"ar_3","text":"KYT-Richtlinie vorhanden","category":"Dokumente","required":true},{"id":"ar_4","text":"Kundenidentifikation dokumentiert","category":"Prozesse","required":true},{"id":"ar_5","text":"Transaktionsüberwachung aktiv","category":"Prozesse","required":true},{"id":"ar_6","text":"Verdachtsmeldungsprozess definiert","category":"Prozesse","required":true},{"id":"ar_7","text":"Schulung durchgeführt","category":"Schulung","required":true},{"id":"ar_8","text":"Jahresbericht erstellt","category":"Fristen","required":true},{"id":"ar_9","text":"Prüfunterlagen bereit","category":"Audit","required":false},{"id":"ar_10","text":"Compliance-Officer bestimmt","category":"Organisation","required":true}]',
   '{"aml_policy","risk_assessment","kyt_policy"}',
   12)
ON CONFLICT (sro, name) DO NOTHING;
