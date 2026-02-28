-- ============================================================================
-- 036: E-Learning Modules
-- AML training modules with quiz and progress tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.elearning_modules (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        UNIQUE NOT NULL,
  title            text        NOT NULL,
  description      text,
  category         text        CHECK (category IN ('aml_basics','kyc','transaction_monitoring','sanctions','mros','annual_training')),
  content          jsonb       NOT NULL DEFAULT '[]',
  duration_minutes integer     DEFAULT 15,
  passing_score    integer     DEFAULT 80,
  sro_relevant     text[]      DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.elearning_progress (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module_id        uuid        NOT NULL REFERENCES public.elearning_modules(id) ON DELETE CASCADE,
  status           text        NOT NULL CHECK (status IN ('not_started','in_progress','completed','failed')) DEFAULT 'not_started',
  score            integer,
  started_at       timestamptz,
  completed_at     timestamptz,
  certificate_data jsonb,
  UNIQUE(user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_elearning_user
  ON public.elearning_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_elearning_org
  ON public.elearning_progress (organization_id);

-- RLS
ALTER TABLE public.elearning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_progress ENABLE ROW LEVEL SECURITY;

-- Everyone can read modules
CREATE POLICY "elearning_modules: public read"
  ON public.elearning_modules FOR SELECT
  USING (true);

-- Admin can manage modules
CREATE POLICY "elearning_modules: admin manage"
  ON public.elearning_modules FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Users can read their own progress
CREATE POLICY "elearning_progress: user can read own"
  ON public.elearning_progress FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own progress
CREATE POLICY "elearning_progress: user can manage own"
  ON public.elearning_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can read all progress
CREATE POLICY "elearning_progress: admin read all"
  ON public.elearning_progress FOR SELECT
  USING (public.is_admin());

-- Seed: 3 initial modules
INSERT INTO public.elearning_modules (slug, title, description, category, duration_minutes, passing_score, sro_relevant, content) VALUES
  ('aml-grundlagen', 'AML-Grundlagen', 'Einführung in die Geldwäschereibekämpfung: GwG, GwV-FINMA, Sorgfaltspflichten', 'aml_basics', 15, 80, '{"VQF","PolyReg","ARIF","SO-FIT"}',
   '[{"type":"text","title":"Was ist Geldwäscherei?","body":"Geldwäscherei ist der Vorgang, durch den die Herkunft von illegal erlangtem Geld verschleiert wird. In der Schweiz wird Geldwäscherei nach Art. 305bis StGB bestraft. Das Geldwäschereigesetz (GwG) regelt die Pflichten der Finanzintermediäre zur Bekämpfung der Geldwäscherei."},{"type":"text","title":"Die 3 Phasen der Geldwäscherei","body":"1. **Placement (Einschleusung):** Illegales Bargeld wird ins Finanzsystem eingebracht.\n2. **Layering (Verschleierung):** Durch komplexe Transaktionen wird die Herkunft der Gelder verschleiert.\n3. **Integration (Integration):** Das gewaschene Geld wird in den legalen Wirtschaftskreislauf zurückgeführt."},{"type":"text","title":"Das GwG und die Sorgfaltspflichten","body":"Das Geldwäschereigesetz (GwG) definiert folgende Kernpflichten:\n- **Identifizierungspflicht** (Art. 3): Vertragspartner identifizieren\n- **Feststellung des wirtschaftlich Berechtigten** (Art. 4)\n- **Erneute Identifizierung** bei Zweifeln (Art. 5)\n- **Dokumentationspflicht** (Art. 7)\n- **Meldepflicht** bei Verdacht (Art. 9)"},{"type":"quiz","question":"Welches Gesetz regelt die Geldwäschereibekämpfung in der Schweiz?","options":["GwG (Geldwäschereigesetz)","OR (Obligationenrecht)","ZGB (Zivilgesetzbuch)","StGB (Strafgesetzbuch)"],"correct":0,"explanation":"Das GwG (Geldwäschereigesetz, SR 955.0) regelt die Pflichten der Finanzintermediäre zur Bekämpfung der Geldwäscherei."},{"type":"quiz","question":"Was ist die erste Phase der Geldwäscherei?","options":["Placement (Einschleusung)","Layering (Verschleierung)","Integration","Strukturierung"],"correct":0,"explanation":"Placement ist die erste Phase, in der illegales Bargeld ins Finanzsystem eingeschleust wird."},{"type":"quiz","question":"Ab welchem Betrag besteht eine erhöhte Sorgfaltspflicht bei Bartransaktionen?","options":["CHF 25''000","CHF 15''000","CHF 100''000","CHF 5''000"],"correct":0,"explanation":"Bei Bartransaktionen ab CHF 25''000 bestehen erhöhte Sorgfaltspflichten gemäss GwG Art. 3."}]'
  ),
  ('kyc-pflichten', 'KYC-Pflichten', 'Kundenidentifikation, wirtschaftlich Berechtigte und Risikoklassifizierung', 'kyc', 20, 80, '{"VQF","PolyReg","ARIF","SO-FIT"}',
   '[{"type":"text","title":"Kundenidentifikation nach VSB","body":"Die Vereinbarung über die Standesregeln zur Sorgfaltspflicht der Banken (VSB) definiert die Standards für die Kundenidentifikation:\n- **Natürliche Personen:** Identifikation anhand eines amtlichen Ausweises (Pass, ID)\n- **Juristische Personen:** Handelsregistereintrag, UID, Zeichnungsberechtigte\n- **Dokumentation:** Kopien aller relevanten Dokumente aufbewahren"},{"type":"text","title":"Wirtschaftlich Berechtigte (UBO)","body":"Der wirtschaftlich Berechtigte ist die natürliche Person, die letztlich Eigentümer des Vermögens ist oder die Kontrolle über die Vertragspartei ausübt.\n\n**Schwellenwert:** Bei juristischen Personen gilt als Kontrollinhaber, wer ≥25% der Anteile oder Stimmrechte hält.\n\n**Pflicht:** Der Finanzintermediär muss den wirtschaftlich Berechtigten mit angemessener Sorgfalt feststellen."},{"type":"text","title":"Risikoklassifizierung","body":"Jeder Kunde muss einer Risikokategorie zugeordnet werden:\n- **Tiefes Risiko:** Inländische Kunden, bekannte Branchen, tiefes Volumen\n- **Normales Risiko:** Standardfälle ohne besondere Risikofaktoren\n- **Erhöhtes Risiko:** Auslandsbezug, PEP-Nähe, komplexe Strukturen\n- **Hohes Risiko:** FATF-Hochrisikoländer, PEP, unklare Mittelherkunft"},{"type":"quiz","question":"Ab welchem Anteil gilt eine Person als Kontrollinhaber (UBO)?","options":["25%","10%","50%","51%"],"correct":0,"explanation":"Als Kontrollinhaber gilt, wer ≥25% der Anteile oder Stimmrechte an einer juristischen Person hält."},{"type":"quiz","question":"Was bedeutet PEP?","options":["Politisch exponierte Person","Persönlich erfasste Person","Privat eingetragener Partner","Professionell evaluiertes Profil"],"correct":0,"explanation":"PEP steht für ''Politisch exponierte Person'' — Personen mit prominenten öffentlichen Funktionen."},{"type":"quiz","question":"Welches Dokument wird für die Identifikation natürlicher Personen benötigt?","options":["Amtlicher Ausweis (Pass/ID)","Handelsregistereintrag","Steuererklärung","Bankauszug"],"correct":0,"explanation":"Natürliche Personen werden anhand eines gültigen amtlichen Ausweises (Pass oder Identitätskarte) identifiziert."}]'
  ),
  ('transaktionsueberwachung', 'Transaktionsüberwachung', 'Art. 20 GwV-FINMA, Schwellenwerte und Verdachtsindikatoren', 'transaction_monitoring', 15, 80, '{"VQF","PolyReg","ARIF","SO-FIT"}',
   '[{"type":"text","title":"Transaktionsüberwachung nach GwV-FINMA","body":"Art. 20 der Geldwäschereiverordnung-FINMA (GwV-FINMA) verpflichtet Finanzintermediäre zur Überwachung der Geschäftsbeziehungen und Transaktionen.\n\n**Pflichten:**\n- Laufende Überwachung aller Transaktionen\n- Erkennung ungewöhnlicher Transaktionsmuster\n- Dokumentation der Überwachungsergebnisse\n- Eskalation bei Verdacht"},{"type":"text","title":"Verdachtsindikatoren","body":"Die MROS (Meldestelle für Geldwäscherei) definiert typische Verdachtsindikatoren:\n- Transaktionen ohne erkennbaren wirtschaftlichen Zweck\n- Häufige Bartransaktionen knapp unter dem Schwellenwert (''Smurfing'')\n- Transaktionen in/aus Hochrisikoländern\n- Plötzliche Änderung des Transaktionsverhaltens\n- Verwendung komplexer Gesellschaftsstrukturen\n- Diskrepanz zwischen Profil und Transaktionsverhalten"},{"type":"text","title":"Schwellenwerte und Meldepflichten","body":"**Schwellenwerte:**\n- Bartransaktionen: CHF 25''000 → erhöhte Sorgfalt\n- Gelegentliche Transaktionen: CHF 25''000 → volle KYC-Pflicht\n\n**Meldepflicht (Art. 9 GwG):**\nBei begründetem Verdacht auf Geldwäscherei muss der Finanzintermediär eine Verdachtsmeldung an die MROS erstatten. Dies muss **unverzüglich** geschehen. Gleichzeitig dürfen die betroffenen Vermögenswerte nicht herausgegeben werden (Vermögenssperre, max. 5 Arbeitstage)."},{"type":"quiz","question":"Welcher Artikel der GwV-FINMA regelt die Transaktionsüberwachung?","options":["Art. 20","Art. 3","Art. 9","Art. 15"],"correct":0,"explanation":"Art. 20 GwV-FINMA verpflichtet zur laufenden Überwachung der Geschäftsbeziehungen und Transaktionen."},{"type":"quiz","question":"Was ist ''Smurfing''?","options":["Aufspaltung grosser Beträge in viele kleine Transaktionen unter dem Schwellenwert","Eine Form der Terrorismusfinanzierung","Ein KYC-Verfahren","Eine Methode der Kundenidentifikation"],"correct":0,"explanation":"Smurfing (Strukturierung) ist das Aufteilen grosser Beträge in kleinere Transaktionen, um Schwellenwerte und Meldepflichten zu umgehen."},{"type":"quiz","question":"Wie lange darf ein Finanzintermediär nach einer MROS-Meldung Vermögenswerte sperren?","options":["5 Arbeitstage","30 Tage","10 Arbeitstage","Unbegrenzt"],"correct":0,"explanation":"Nach Art. 10 GwG dürfen Vermögenswerte für maximal 5 Arbeitstage gesperrt werden, bis die MROS entscheidet."}]'
  )
ON CONFLICT (slug) DO NOTHING;
