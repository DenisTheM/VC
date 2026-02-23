-- ============================================================================
-- 017: Document Versioning
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_versions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version     text        NOT NULL,
  name        text        NOT NULL,
  content     text,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Admin can read all versions
CREATE POLICY "document_versions: admin can read all"
  ON public.document_versions
  FOR SELECT
  USING (public.is_admin());

-- Clients can read versions of their org's documents
CREATE POLICY "document_versions: clients can read own org"
  ON public.document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      JOIN public.organization_members om
        ON om.organization_id = d.organization_id
      WHERE d.id = document_versions.document_id
        AND om.user_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_versions_doc
  ON public.document_versions (document_id, created_at DESC);

-- ============================================================================
-- Trigger: Save old version before content update
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_document_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only save when content actually changes
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.document_versions (document_id, version, name, content, created_by)
    VALUES (OLD.id, OLD.version, OLD.name, OLD.content, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_save_document_version ON public.documents;
CREATE TRIGGER trg_save_document_version
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.save_document_version();
