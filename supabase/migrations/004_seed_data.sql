-- =============================================================================
-- Migration 004: Seed Data
-- Virtue Compliance GmbH
-- Created: 2026-02-22
--
-- Seeds: organizations, company_profiles, regulatory_alerts,
--        alert_action_items, alert_affected_clients
-- =============================================================================

-- =============================================================================
-- 1. ORGANIZATIONS
-- Insert Align Technology AG (the primary demo client) and additional orgs
-- referenced as affected clients in regulatory alerts.
-- =============================================================================

-- Only insert orgs that don't already exist (Align Technology AG was already created manually)
INSERT INTO public.organizations (name, short_name, industry, sro)
SELECT * FROM (VALUES
  ('oomnium AG', 'oomnium', 'Effektenhandel', NULL::text),
  ('SwissFintech AG', 'SwissFintech', 'Crypto / DLT', NULL::text),
  ('BlockPay GmbH', 'BlockPay', 'Crypto / DLT', NULL::text),
  ('FrankfurtPay GmbH', 'FrankfurtPay', 'Zahlungsverkehr', NULL::text)
) AS v(name, short_name, industry, sro)
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations o WHERE o.name = v.name
);

-- =============================================================================
-- 2. COMPANY PROFILE for Align Technology AG
-- =============================================================================

DO $$
DECLARE
  v_align_org_id uuid;
BEGIN
  SELECT id INTO v_align_org_id
    FROM public.organizations
   WHERE name = 'Align Technology AG'
   LIMIT 1;

  -- Only insert if no company profile exists for this org yet
  IF NOT EXISTS (SELECT 1 FROM public.company_profiles WHERE organization_id = v_align_org_id) THEN
  INSERT INTO public.company_profiles (organization_id, data, completed)
  VALUES (
    v_align_org_id,
    '{
      "company_name": "Align Technology Switzerland GmbH",
      "legal_form": "GmbH",
      "uid": "CHE-123.456.789",
      "address": "Suurstoffi 22, 6343 Rotkreuz",
      "founding_year": "2019",
      "industry": "Leasing / Finanzierung",
      "business_detail": "36-monatige Operating-Leases für medizinische Intraoralscanner",
      "employees": "45",
      "management": "Daniel Müller (CEO), Sarah Fischer (CFO)",
      "compliance_officer": "Elena Scheller (extern, Virtue Compliance)",
      "sro": "VQF",
      "sro_status": "Aufnahme beantragt",
      "finma_license": "Keine",
      "tx_volume": "CHF 1-10 Mio.",
      "client_types": ["B2B (Unternehmen)"],
      "geo_focus": ["Schweiz", "EU/EWR"],
      "products": ["Kreditvergabe / Leasing"],
      "crypto": false,
      "cross_border": true,
      "existing_infra": []
    }'::jsonb,
    true
  );
  END IF;
END $$;

-- =============================================================================
-- 3. REGULATORY ALERTS + ACTION ITEMS + AFFECTED CLIENTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Alert 1 (ra-001): GwG-Totalrevision — critical / new / CH
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_alert_id  uuid;
  v_org_align uuid;
  v_org_oomn  uuid;
  v_org_swft  uuid;
BEGIN
  -- Insert the alert
  INSERT INTO public.regulatory_alerts (
    title, source, jurisdiction, date, severity, status,
    category, summary, legal_basis, deadline, elena_comment
  ) VALUES (
    'GwG-Totalrevision: Transparenzregister & erweiterte Sorgfaltspflichten',
    'Bundesrat / Parlament',
    'CH',
    '14. Feb 2026',
    'critical',
    'new',
    'GwG / AMLA',
    'Die Totalrevision des Geldwäschereigesetzes bringt ein zentrales Transparenzregister für wirtschaftlich Berechtigte und erweitert die Sorgfaltspflichten auf Berater, Immobilienmakler und Edelmetallhändler. Bargeldschwelle wird von CHF 100''000 auf CHF 15''000 gesenkt.',
    'GwG-Revision (BBl 2024), Art. 2, 3, 4, 5, 6 GwG (neu)',
    'Voraussichtlich Q3 2026',
    'Das ist die grösste Änderung im Schweizer AML-Recht seit Jahren. Für unsere Kunden bedeutet das konkret: (1) Align muss die KYC-Prozesse im Leasing-Onboarding anpassen — die neue Bargeldschwelle von CHF 15''000 betrifft auch Leasingraten. (2) oomnium braucht ein Update der internen Weisung für das UBO-Register. (3) Alle Kunden brauchen eine Anpassung der AML-Richtlinie vor Q3 2026. Ich empfehle, ab sofort die neuen Anforderungen in die Dokument-Templates einzubauen und Kunden proaktiv zu informieren.'
  )
  RETURNING id INTO v_alert_id;

  -- Action items (4)
  INSERT INTO public.alert_action_items (alert_id, text, priority, due) VALUES
    (v_alert_id, 'AML-Richtlinien aller Kunden auf neue Schwellenwerte aktualisieren', 'high', 'Q2 2026'),
    (v_alert_id, 'UBO-Register-Prozess für jur. Personen dokumentieren', 'high', 'Q2 2026'),
    (v_alert_id, 'Kunden-Webinar zu GwG-Revision durchführen', 'medium', 'März 2026'),
    (v_alert_id, 'Sumsub-Workflow auf neue CDD-Felder erweitern', 'medium', 'Q3 2026');

  -- Affected clients
  SELECT id INTO v_org_align FROM public.organizations WHERE name = 'Align Technology AG' LIMIT 1;
  SELECT id INTO v_org_oomn  FROM public.organizations WHERE name = 'oomnium AG'          LIMIT 1;
  SELECT id INTO v_org_swft  FROM public.organizations WHERE name = 'SwissFintech AG'     LIMIT 1;

  INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk) VALUES
    (v_alert_id, v_org_align, 'Leasing-Programm unterfällt neuen Schwellenwerten', 'high'),
    (v_alert_id, v_org_oomn,  'Effektenhandel — erweiterte UBO-Dokumentation erforderlich', 'high'),
    (v_alert_id, v_org_swft,  'Crypto-Custody betroffen durch neue Travel Rule Schwellenwerte', 'medium');
END $$;

-- -----------------------------------------------------------------------------
-- Alert 2 (ra-002): FINMA Krypto-Verwahrung & Staking — high / new / CH
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_alert_id   uuid;
  v_org_swft   uuid;
  v_org_block  uuid;
BEGIN
  INSERT INTO public.regulatory_alerts (
    title, source, jurisdiction, date, severity, status,
    category, summary, legal_basis, deadline, elena_comment
  ) VALUES (
    'FINMA: Verschärfte Anforderungen an Krypto-Verwahrung & Staking',
    'FINMA Aufsichtsmitteilung 01/2026',
    'CH',
    '10. Feb 2026',
    'high',
    'new',
    'Krypto / DLT',
    'FINMA konkretisiert die Anforderungen an die Verwahrung von Kryptowerten (Custody) und stuft Staking-Dienstleistungen neu als bewilligungspflichtig ein.',
    'Art. 1b BankG, FINMA-Aufsichtsmitteilung 01/2026, AMLO-FINMA Art. 20',
    '31. Dez 2026',
    'Betrifft primär unsere Crypto-Kunden. SwissFintech muss das Custody-Risiko-Framework bis Q4 erweitern — ich schlage vor, das in die nächste Audit-Vorbereitung einzubauen.'
  )
  RETURNING id INTO v_alert_id;

  -- Action items (3)
  INSERT INTO public.alert_action_items (alert_id, text, priority, due) VALUES
    (v_alert_id, 'Crypto-Custody-Risiko-Framework für SwissFintech erweitern', 'high', 'Q3 2026'),
    (v_alert_id, 'Staking-Bewilligungspflicht für BlockPay abklären mit SRO', 'high', 'März 2026'),
    (v_alert_id, 'KYT-Policy-Template um Crypto-spezifische Regeln ergänzen', 'medium', 'Q2 2026');

  -- Affected clients
  SELECT id INTO v_org_swft  FROM public.organizations WHERE name = 'SwissFintech AG' LIMIT 1;
  SELECT id INTO v_org_block FROM public.organizations WHERE name = 'BlockPay GmbH'   LIMIT 1;

  INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk) VALUES
    (v_alert_id, v_org_swft,  'Betreibt Crypto-Custody für Endkunden', 'high'),
    (v_alert_id, v_org_block, 'Staking-Service muss neu bewilligt werden', 'high');
END $$;

-- -----------------------------------------------------------------------------
-- Alert 3 (ra-003): AMLO-FINMA Travel Rule — high / acknowledged / CH
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_alert_id   uuid;
  v_org_swft   uuid;
  v_org_block  uuid;
BEGIN
  INSERT INTO public.regulatory_alerts (
    title, source, jurisdiction, date, severity, status,
    category, summary, legal_basis, deadline, elena_comment
  ) VALUES (
    'AMLO-FINMA: Travel Rule Schwellenwert auf CHF 0 gesenkt',
    'FINMA / FATF',
    'CH',
    '5. Feb 2026',
    'high',
    'acknowledged',
    'Travel Rule',
    'Die FINMA setzt die FATF-Empfehlungen vollständig um und senkt den Schwellenwert für die Übermittlung von Auftraggeberdaten bei Blockchain-Transaktionen auf CHF 0.',
    'AMLO-FINMA Art. 10 (revidiert), FATF Recommendation 16',
    'Sofort anwendbar',
    'Die Änderung ist bereits in Kraft — hier besteht unmittelbarer Handlungsbedarf. Die Transaktionsüberwachung muss angepasst werden.'
  )
  RETURNING id INTO v_alert_id;

  -- Action items (2)
  INSERT INTO public.alert_action_items (alert_id, text, priority, due) VALUES
    (v_alert_id, 'Travel Rule Compliance bei allen Crypto-Kunden überprüfen', 'high', 'Feb 2026'),
    (v_alert_id, 'KYT-Monitoring Schwellenwerte anpassen (CHF 0)', 'high', 'Sofort');

  -- Affected clients
  SELECT id INTO v_org_swft  FROM public.organizations WHERE name = 'SwissFintech AG' LIMIT 1;
  SELECT id INTO v_org_block FROM public.organizations WHERE name = 'BlockPay GmbH'   LIMIT 1;

  INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk) VALUES
    (v_alert_id, v_org_swft,  'Alle Crypto-Transfers betroffen', 'high'),
    (v_alert_id, v_org_block, 'Payment-Processing über Blockchain', 'high');
END $$;

-- -----------------------------------------------------------------------------
-- Alert 4 (ra-004): BaFin KYC-Pflichten — medium / acknowledged / DE
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_alert_id    uuid;
  v_org_fkpay   uuid;
BEGIN
  INSERT INTO public.regulatory_alerts (
    title, source, jurisdiction, date, severity, status,
    category, summary, legal_basis, deadline, elena_comment
  ) VALUES (
    'BaFin: Aktualisierte Auslegungshinweise zum GwG — Erweiterte KYC-Pflichten',
    'BaFin',
    'DE',
    '30. Jan 2026',
    'medium',
    'acknowledged',
    'KYC / CDD',
    'Die BaFin hat ihre Auslegungshinweise zum Geldwäschegesetz aktualisiert. Neu sind erweiterte Anforderungen an die laufende Überwachung von Geschäftsbeziehungen.',
    '§§ 10-17 GwG (DE), BaFin Auslegungshinweise 01/2026',
    'Sofort anwendbar',
    'Relevant für unsere deutschen Kunden, insbesondere FrankfurtPay. Die KYC-Checklisten für Deutschland müssen ergänzt werden.'
  )
  RETURNING id INTO v_alert_id;

  -- Action items (2)
  INSERT INTO public.alert_action_items (alert_id, text, priority, due) VALUES
    (v_alert_id, 'KYC-Checkliste DE-Template aktualisieren', 'medium', 'Q2 2026'),
    (v_alert_id, 'Laufende Überwachung: Prozess-Update für DE-Kunden', 'low', 'Q2 2026');

  -- Affected clients
  SELECT id INTO v_org_fkpay FROM public.organizations WHERE name = 'FrankfurtPay GmbH' LIMIT 1;

  INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk) VALUES
    (v_alert_id, v_org_fkpay, 'Payment-Dienstleister mit DE-Lizenz', 'medium');
END $$;

-- -----------------------------------------------------------------------------
-- Alert 5 (ra-005): FINMA Risikoanalysen — info / resolved / CH
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO public.regulatory_alerts (
    title, source, jurisdiction, date, severity, status,
    category, summary, legal_basis, deadline, elena_comment
  ) VALUES (
    'FINMA-Aufsichtsmitteilung: Mängel bei Risikoanalysen festgestellt',
    'FINMA Aufsichtsmitteilung 05/2023 (Nachverfolgung 2026)',
    'CH',
    '22. Jan 2026',
    'info',
    'resolved',
    'Risiko-Framework',
    'FINMA publiziert Follow-up zur Aufsichtsmitteilung 05/2023 über Mängel bei AML-Risikoanalysen. Betont erneut die vier Pflicht-Risikokategorien.',
    'Art. 25 Abs. 2 AMLO-FINMA, FINMA-Aufsichtsmitteilung 05/2023',
    'Laufend',
    'Keine direkte Auswirkung auf unsere Kunden, da wir die Risikoklassifizierung bereits nach den vier FINMA-Pflichtkategorien aufbauen.'
  )
  RETURNING id INTO v_alert_id;

  -- Action items (1)
  INSERT INTO public.alert_action_items (alert_id, text, priority, due) VALUES
    (v_alert_id, 'Risikoklassifizierungs-Template gegen FINMA-Erwartungen validieren', 'low', 'Q2 2026');

  -- No affected clients for this alert
END $$;
