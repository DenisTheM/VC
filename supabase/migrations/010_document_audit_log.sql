-- =============================================================================
-- Migration 010: Document Audit Log
-- Immutable audit trail for all document status changes.
-- PostgreSQL trigger writes automatically — no app-level INSERT needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Audit log table
-- -----------------------------------------------------------------------------

CREATE TABLE public.document_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN ('created','updated','status_changed','approved')),
  old_status  text,
  new_status  text,
  changed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  details     text
);

CREATE INDEX idx_audit_log_document ON public.document_audit_log(document_id, changed_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Trigger function (SECURITY DEFINER — bypasses RLS to write)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.document_audit_log(document_id, action, new_status, changed_by, details)
    VALUES (NEW.id, 'created', NEW.status, COALESCE(NEW.created_by, auth.uid()), 'Dokument erstellt');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'current' AND OLD.status = 'review' THEN
        INSERT INTO public.document_audit_log(document_id, action, old_status, new_status, changed_by, details)
        VALUES (NEW.id, 'approved', OLD.status, NEW.status, COALESCE(NEW.approved_by, auth.uid()), 'Dokument freigegeben');
      ELSE
        INSERT INTO public.document_audit_log(document_id, action, old_status, new_status, changed_by, details)
        VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, auth.uid(),
                'Status: ' || COALESCE(OLD.status, '?') || ' → ' || COALESCE(NEW.status, '?'));
      END IF;
    ELSIF OLD.content IS DISTINCT FROM NEW.content OR OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO public.document_audit_log(document_id, action, old_status, new_status, changed_by, details)
      VALUES (NEW.id, 'updated', OLD.status, NEW.status, auth.uid(), 'Dokument aktualisiert');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_audit
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.log_document_change();

-- -----------------------------------------------------------------------------
-- 3. RLS — immutable for users (only trigger can write)
-- -----------------------------------------------------------------------------

ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin: read all
CREATE POLICY "audit_log: admin select" ON public.document_audit_log
  FOR SELECT USING (public.is_admin());

-- Clients: only own organisation
CREATE POLICY "audit_log: client select own org" ON public.document_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.organization_members om ON om.organization_id = d.organization_id
      WHERE d.id = document_audit_log.document_id AND om.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies → table is immutable for all users.
-- Only the SECURITY DEFINER trigger can write.

-- -----------------------------------------------------------------------------
-- 4. Backfill existing documents
-- -----------------------------------------------------------------------------

-- 4a. "created" entry for every document
INSERT INTO public.document_audit_log (document_id, action, new_status, changed_by, changed_at, details)
SELECT id, 'created', status, created_by, created_at, 'Dokument erstellt (Backfill)'
FROM public.documents
WHERE id NOT IN (SELECT document_id FROM public.document_audit_log);

-- 4b. "approved" entry for documents that were already approved
INSERT INTO public.document_audit_log (document_id, action, old_status, new_status, changed_by, changed_at, details)
SELECT id, 'approved', 'review', 'current', approved_by, approved_at, 'Dokument freigegeben (Backfill)'
FROM public.documents
WHERE status = 'current' AND approved_at IS NOT NULL;
