-- ============================================================================
-- 011: Portal-Qualität — contact_salutation, Elena-Greeting-Fix, Status-Bereinigung
-- ============================================================================

-- 1. contact_salutation auf organizations (für dynamische Ansprache)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS contact_salutation text
  CHECK (contact_salutation IN ('Herr', 'Frau'));

-- 2. Seed-Daten: Align Technology AG → "Herr" (Daniel)
UPDATE public.organizations
  SET contact_salutation = 'Herr'
  WHERE name = 'Align Technology AG';

-- 3. Elena-Kommentare: Greeting-Prefix entfernen (wird künftig dynamisch gerendert)
UPDATE public.alert_affected_clients
  SET elena_comment = regexp_replace(elena_comment, '^Liebe[r]?\s+\w+,\s*', '')
  WHERE elena_comment ~ '^Liebe[r]?\s+\w+,';

-- 4. Action-Status "geplant" → "offen" normalisieren
--    "Geplant" hat keine klare Semantik im Client-Portal.
--    Neuer Status-Zyklus: offen → in_arbeit → erledigt
UPDATE public.client_alert_actions
  SET status = 'offen'
  WHERE status = 'geplant';
