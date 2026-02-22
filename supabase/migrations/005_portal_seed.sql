-- =============================================================================
-- Migration 005: Portal Seed Data
-- Virtue Compliance GmbH
-- Created: 2026-02-22
--
-- Adds: document metadata columns, Align-specific alert data,
--       client_alert_actions, alert_related_documents, portal documents
-- =============================================================================

-- =============================================================================
-- 1. ADD MISSING COLUMNS TO DOCUMENTS TABLE
-- =============================================================================

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS alert_notice text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_by_name text;

-- =============================================================================
-- 2. UPDATE EXISTING ALERT_AFFECTED_CLIENTS FOR ALIGN (GwG-Totalrevision)
--    Add elena_comment and fuller reason text for the Portal view
-- =============================================================================

DO $$
DECLARE
  v_aac_id uuid;
  v_org_align uuid;
  v_alert_id uuid;
BEGIN
  SELECT id INTO v_org_align FROM public.organizations WHERE name = 'Align Technology AG' LIMIT 1;
  SELECT id INTO v_alert_id FROM public.regulatory_alerts WHERE title LIKE 'GwG-Totalrevision%' LIMIT 1;

  IF v_org_align IS NOT NULL AND v_alert_id IS NOT NULL THEN
    -- Update the affected client entry with elena_comment and fuller reason
    UPDATE public.alert_affected_clients
    SET
      reason = 'Direkte Auswirkung auf Align: Die neue Bargeldschwelle von CHF 15''000 erfasst auch Leasingraten. Ihr Onboarding-Prozess und die interne AML-Richtlinie müssen angepasst werden. Das neue UBO-Register erfordert eine erweiterte Dokumentation bei der Identifikation Ihrer Leasingnehmer.',
      elena_comment = 'Lieber Daniel, die GwG-Totalrevision ist die grösste Änderung im Schweizer AML-Recht seit Jahren. Für Align konkret: (1) Die neue Bargeldschwelle von CHF 15''000 erfasst auch Leasingraten — Ihr Onboarding-Prozess muss angepasst werden. (2) Das neue UBO-Register erfordert eine erweiterte Dokumentation bei der Identifikation Ihrer Leasingnehmer. (3) Ich empfehle, die interne AML-Richtlinie bereits jetzt anzupassen, damit Sie vor Q3 2026 bereit sind. Ich bereite die aktualisierte Richtlinie nächste Woche vor und schicke Ihnen einen Entwurf zur Freigabe.'
    WHERE organization_id = v_org_align AND alert_id = v_alert_id;

    -- Get the aac id for adding actions and docs
    SELECT id INTO v_aac_id FROM public.alert_affected_clients
    WHERE organization_id = v_org_align AND alert_id = v_alert_id LIMIT 1;

    -- Client-specific actions
    IF NOT EXISTS (SELECT 1 FROM public.client_alert_actions WHERE alert_affected_client_id = v_aac_id) THEN
      INSERT INTO public.client_alert_actions (alert_affected_client_id, text, due, status) VALUES
        (v_aac_id, 'Interne AML-Richtlinie auf neue Schwellenwerte aktualisieren', 'Q2 2026', 'offen'),
        (v_aac_id, 'Onboarding-Prozess für Leasingnehmer anpassen', 'Q2 2026', 'offen'),
        (v_aac_id, 'UBO-Dokumentation erweitern', 'Q3 2026', 'offen'),
        (v_aac_id, 'Schulung Mitarbeitende zur GwG-Revision', 'Q3 2026', 'geplant');
    END IF;

    -- Related docs
    IF NOT EXISTS (SELECT 1 FROM public.alert_related_documents WHERE alert_affected_client_id = v_aac_id) THEN
      INSERT INTO public.alert_related_documents (alert_affected_client_id, name, type, date) VALUES
        (v_aac_id, 'AML-Richtlinie Align v2.1', 'DOCX', 'Nov 2025'),
        (v_aac_id, 'KYC-Onboarding Checkliste', 'PDF', 'Okt 2025'),
        (v_aac_id, 'GwG-Revision Faktenblatt', 'PDF', 'Feb 2026');
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 3. ADD ALIGN AS AFFECTED CLIENT FOR AMLO-FINMA TRAVEL RULE ALERT
-- =============================================================================

DO $$
DECLARE
  v_aac_id uuid;
  v_org_align uuid;
  v_alert_id uuid;
BEGIN
  SELECT id INTO v_org_align FROM public.organizations WHERE name = 'Align Technology AG' LIMIT 1;
  SELECT id INTO v_alert_id FROM public.regulatory_alerts WHERE title LIKE 'AMLO-FINMA: Travel Rule%' LIMIT 1;

  IF v_org_align IS NOT NULL AND v_alert_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.alert_affected_clients WHERE organization_id = v_org_align AND alert_id = v_alert_id) THEN
      INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk, elena_comment)
      VALUES (
        v_alert_id,
        v_org_align,
        'Indirekte Auswirkung: Betrifft primär Krypto-Finanzintermediäre, jedoch relevant für Align falls zukünftige Zahlungsströme über Blockchain-Infrastruktur abgewickelt werden.',
        'medium',
        'Lieber Daniel, diese Änderung betrifft Align derzeit nur indirekt. Falls Sie jedoch planen, Zahlungen über Blockchain-Infrastruktur abzuwickeln, gelten neu ab dem ersten Franken die Travel-Rule-Pflichten. Ich empfehle, das im nächsten Risikoanalyse-Update zu berücksichtigen.'
      ) RETURNING id INTO v_aac_id;

      INSERT INTO public.client_alert_actions (alert_affected_client_id, text, due, status) VALUES
        (v_aac_id, 'Risikoanalyse: Blockchain-Zahlungsströme prüfen', 'Q2 2026', 'offen'),
        (v_aac_id, 'Travel Rule in AML-Richtlinie als Annex ergänzen', 'Q3 2026', 'geplant');

      INSERT INTO public.alert_related_documents (alert_affected_client_id, name, type, date) VALUES
        (v_aac_id, 'Risikoanalyse Align v1.3', 'DOCX', 'Sep 2025'),
        (v_aac_id, 'AMLO-FINMA Zusammenfassung', 'PDF', 'Feb 2026');
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 4. CREATE SRO/SLV ALERT + LINK ALIGN AS AFFECTED CLIENT
-- =============================================================================

DO $$
DECLARE
  v_alert_id uuid;
  v_org_align uuid;
  v_aac_id uuid;
BEGIN
  SELECT id INTO v_org_align FROM public.organizations WHERE name = 'Align Technology AG' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.regulatory_alerts WHERE title LIKE 'SRO/SLV: Aktualisierte Prüfungsstandards%') THEN
    INSERT INTO public.regulatory_alerts (
      title, source, jurisdiction, date, severity, status,
      category, summary, legal_basis, deadline, elena_comment
    ) VALUES (
      'SRO/SLV: Aktualisierte Prüfungsstandards für Mitglieder',
      'SRO/SLV',
      'CH',
      '20. Jan 2026',
      'medium',
      'acknowledged',
      'SRO-Prüfung',
      'Die SRO/SLV hat die Prüfungsstandards für Mitglieder aktualisiert. Neu werden bei der periodischen Prüfung verstärkt die Umsetzung der Risikoanalyse und die Schulungsdokumentation geprüft.',
      'SRO/SLV Reglement, Prüfungsstandards 2026',
      'Nächste SRO-Prüfung (voraussichtlich Q4 2026)',
      'Formale Anpassung an neue Prüfungsstandards — geringe Auswirkung da Dokumentation bereits gut aufgestellt.'
    ) RETURNING id INTO v_alert_id;

    IF v_org_align IS NOT NULL THEN
      INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk, elena_comment)
      VALUES (
        v_alert_id,
        v_org_align,
        'Geringe Auswirkung: Ihre Risikoanalyse und Schulungsdokumentation sind bereits auf dem aktuellen Stand. Lediglich formale Anpassungen an die neuen Prüfungschecklisten erforderlich.',
        'low',
        'Lieber Daniel, gute Nachrichten — Ihre Dokumentation ist bereits gut aufgestellt. Die aktualisierten Prüfungsstandards erfordern nur kleine formale Anpassungen an der Prüfungscheckliste. Ich aktualisiere diese im Rahmen der nächsten regulären Dokumentenrevision.'
      ) RETURNING id INTO v_aac_id;

      INSERT INTO public.client_alert_actions (alert_affected_client_id, text, due, status) VALUES
        (v_aac_id, 'Prüfungscheckliste an neue SRO-Standards anpassen', 'Q3 2026', 'geplant');

      INSERT INTO public.alert_related_documents (alert_affected_client_id, name, type, date) VALUES
        (v_aac_id, 'SRO-Aufnahmeanmeldung', 'PDF', 'Dez 2025'),
        (v_aac_id, 'Prüfungscheckliste Align', 'DOCX', 'Nov 2025');
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 5. ADD ALIGN AS AFFECTED CLIENT FOR FINMA RISIKOANALYSEN ALERT
-- =============================================================================

DO $$
DECLARE
  v_aac_id uuid;
  v_org_align uuid;
  v_alert_id uuid;
BEGIN
  SELECT id INTO v_org_align FROM public.organizations WHERE name = 'Align Technology AG' LIMIT 1;
  SELECT id INTO v_alert_id FROM public.regulatory_alerts WHERE title LIKE 'FINMA-Aufsichtsmitteilung: Mängel bei Risikoanalysen%' LIMIT 1;

  IF v_org_align IS NOT NULL AND v_alert_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.alert_affected_clients WHERE organization_id = v_org_align AND alert_id = v_alert_id) THEN
      INSERT INTO public.alert_affected_clients (alert_id, organization_id, reason, risk, elena_comment)
      VALUES (
        v_alert_id,
        v_org_align,
        'Keine Auswirkung: Ihre Risikoanalyse entspricht bereits den vier FINMA-Pflicht-Risikokategorien. Kein Handlungsbedarf.',
        'none',
        'Lieber Daniel, das ist eine reine Bestätigung — Ihre Risikoanalyse erfüllt alle FINMA-Anforderungen. Kein Handlungsbedarf Ihrerseits. Ich archiviere diese Meldung als informativ.'
      ) RETURNING id INTO v_aac_id;

      INSERT INTO public.alert_related_documents (alert_affected_client_id, name, type, date) VALUES
        (v_aac_id, 'Risikoanalyse Align v1.3', 'DOCX', 'Sep 2025');
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 6. SEED DOCUMENTS FOR ALIGN TECHNOLOGY
-- =============================================================================

DO $$
DECLARE
  v_org_align uuid;
BEGIN
  SELECT id INTO v_org_align FROM public.organizations WHERE name = 'Align Technology AG' LIMIT 1;

  IF v_org_align IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.documents WHERE organization_id = v_org_align) THEN
    INSERT INTO public.documents (organization_id, doc_type, name, description, category, version, status, format, pages, legal_basis, alert_notice, updated_by_name, updated_at) VALUES
      (v_org_align, 'aml_richtlinie', 'AML-Richtlinie Align Technology',
       'Interne Richtlinie zur Bekämpfung von Geldwäscherei und Terrorismusfinanzierung gemäss GwG.',
       'AML-Grundlagen', 'v2.1', 'review', 'DOCX', 34, 'Art. 3–8 GwG, AMLO-FINMA',
       'Aktualisierung erforderlich wegen GwG-Totalrevision', 'Elena Hartmann', '2025-11-15'),

      (v_org_align, 'risikoanalyse', 'Risikoanalyse Align Technology',
       'Umfassende Risikoanalyse nach den vier FINMA-Pflicht-Risikokategorien: Länderrisiko, Kundenrisiko, Produkt-/Dienstleistungsrisiko, Transaktionsrisiko.',
       'AML-Grundlagen', 'v1.3', 'current', 'DOCX', 22, 'Art. 25 Abs. 2 AMLO-FINMA',
       NULL, 'Elena Hartmann', '2025-09-20'),

      (v_org_align, 'kyc_checkliste', 'KYC-Onboarding Checkliste',
       'Standardisierte Checkliste für die Kundenidentifikation und -verifizierung beim Onboarding neuer Leasingnehmer.',
       'AML-Grundlagen', 'v3.0', 'review', 'PDF', 8, 'Art. 3–5 GwG, VSB 20',
       'Anpassung an neue CHF 15''000 Schwelle erforderlich', 'Elena Hartmann', '2025-10-10'),

      (v_org_align, 'formular_a', 'Formular A – Feststellung der Vertragspartei',
       'Identifikationsformular für natürliche und juristische Personen gemäss VSB 20.',
       'AML-Grundlagen', 'v2.0', 'current', 'PDF', 4, 'VSB 20, Art. 3 GwG',
       NULL, 'Elena Hartmann', '2025-08-05'),

      (v_org_align, 'sro_anmeldung', 'SRO-Aufnahmeanmeldung',
       'Anmeldeformular und Begleitdokumentation für die SRO/SLV-Mitgliedschaft.',
       'SRO-Unterlagen', 'v1.0', 'current', 'PDF', 12, 'SRO/SLV Aufnahmereglement',
       NULL, 'Elena Hartmann', '2025-12-01'),

      (v_org_align, 'pruefungscheckliste', 'Prüfungscheckliste SRO-Audit',
       'Checkliste zur Vorbereitung auf die periodische SRO-Prüfung mit allen relevanten Prüfungspunkten.',
       'SRO-Unterlagen', 'v1.2', 'draft', 'DOCX', 6, 'SRO/SLV Prüfungsstandards 2026',
       'Formale Anpassung an neue Prüfungsstandards', 'Elena Hartmann', '2025-11-18'),

      (v_org_align, 'schulung', 'AML-Schulung Mitarbeitende',
       'Schulungsunterlagen zur Sensibilisierung und Weiterbildung der Mitarbeitenden im Bereich Geldwäschereibekämpfung.',
       'Schulung', 'v2.0', 'current', 'PPTX', 45, 'Art. 8 GwG, AMLO-FINMA Art. 26',
       NULL, 'Elena Hartmann', '2025-09-12'),

      (v_org_align, 'schulungsnachweis', 'Schulungsnachweis & Teilnehmerliste',
       'Dokumentation der durchgeführten Schulungen inkl. Teilnehmerlisten und Testresultate.',
       'Schulung', 'v1.1', 'current', 'XLSX', 3, 'AMLO-FINMA Art. 26',
       NULL, 'Daniel Müller', '2025-09-15'),

      (v_org_align, 'transaktionsueberwachung', 'Transaktionsüberwachung Richtlinie',
       'Richtlinie zur laufenden Überwachung von Geschäftsbeziehungen und Transaktionen inkl. Meldekriterien.',
       'Monitoring', 'v1.4', 'current', 'DOCX', 18, 'Art. 6 GwG, AMLO-FINMA Art. 20',
       NULL, 'Elena Hartmann', '2025-10-08'),

      (v_org_align, 'verdachtsmeldung', 'Verdachtsmeldung Vorlage (MROS)',
       'Vorlage für Verdachtsmeldungen an die Meldestelle für Geldwäscherei (MROS) gemäss Art. 9 GwG.',
       'Monitoring', 'v1.0', 'current', 'DOCX', 5, 'Art. 9 GwG, Art. 3 MROS-Verordnung',
       NULL, 'Elena Hartmann', '2025-07-20');
  END IF;
END $$;
