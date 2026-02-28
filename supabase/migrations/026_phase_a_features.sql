-- ============================================================================
-- 026: Phase A Features
-- Document Expiry, Versioning Fix, Message Read-Tracking, Weekly Digest,
-- Audit Score Cache
-- ============================================================================

-- 1. Document Expiry: next_review column + index
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS next_review date;

CREATE INDEX IF NOT EXISTS idx_documents_next_review
  ON public.documents (next_review)
  WHERE next_review IS NOT NULL AND status = 'current';

-- Default next_review for existing current docs (1 year from approval/creation)
UPDATE public.documents
SET next_review = (COALESCE(approved_at, created_at)::date + INTERVAL '1 year')::date
WHERE status = 'current' AND next_review IS NULL;

-- Trigger: auto-set next_review on status transitions (INSERT + UPDATE)
CREATE OR REPLACE FUNCTION public.auto_set_next_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- On INSERT with status='current', auto-set next_review
    IF NEW.status = 'current' AND NEW.next_review IS NULL THEN
      NEW.next_review := (now()::date + INTERVAL '1 year')::date;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- When status changes to 'current', set next_review to 1 year from now
    IF NEW.status = 'current' AND OLD.status IS DISTINCT FROM 'current' THEN
      NEW.next_review := (now()::date + INTERVAL '1 year')::date;
    -- When status changes away from 'current', clear next_review
    ELSIF OLD.status = 'current' AND NEW.status IS DISTINCT FROM 'current' THEN
      NEW.next_review := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_next_review ON public.documents;
CREATE TRIGGER trg_auto_set_next_review
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_next_review();

-- 2. Versioning Fix: auto-increment version + created_by
-- Note: trigger trg_save_document_version was created in migration 017
-- and continues to reference this function by name.
CREATE OR REPLACE FUNCTION public.save_document_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_minor int;
  _major text;
  _next_version text;
  _uid uuid;
BEGIN
  -- Only save when content actually changes
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    -- Extract major version from current document version (e.g. 'v1.3' → 'v1')
    _major := split_part(COALESCE(OLD.version, 'v1.0'), '.', 1);

    -- Find highest minor version number in history
    SELECT COALESCE(MAX(
      CASE WHEN split_part(version, '.', 1) = _major
           THEN NULLIF(split_part(version, '.', 2), '')::int
           ELSE 0
      END
    ), 0) INTO _max_minor
    FROM public.document_versions
    WHERE document_id = OLD.id;

    -- Also consider the current document version
    IF split_part(COALESCE(OLD.version, 'v1.0'), '.', 1) = _major THEN
      _max_minor := GREATEST(_max_minor, COALESCE(NULLIF(split_part(OLD.version, '.', 2), '')::int, 0));
    END IF;

    _next_version := _major || '.' || (_max_minor + 1)::text;

    -- Use auth.uid() if available, fall back to NULL for service-role updates
    BEGIN
      _uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      _uid := NULL;
    END;

    INSERT INTO public.document_versions (document_id, version, name, content, created_by)
    VALUES (OLD.id, OLD.version, OLD.name, OLD.content, _uid);

    -- Update the document's version number
    NEW.version := _next_version;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Message Read-Tracking
CREATE TABLE IF NOT EXISTS public.admin_message_reads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid        NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.admin_message_reads ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their own reads
CREATE POLICY "admin_message_reads: user can read own"
  ON public.admin_message_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS: Users can insert their own reads
CREATE POLICY "admin_message_reads: user can insert own"
  ON public.admin_message_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin can read all
CREATE POLICY "admin_message_reads: admin can read all"
  ON public.admin_message_reads
  FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_admin_message_reads_message
  ON public.admin_message_reads (message_id);

CREATE INDEX IF NOT EXISTS idx_admin_message_reads_user
  ON public.admin_message_reads (user_id);

-- RLS: Users can update their own reads (needed for upsert ON CONFLICT DO UPDATE)
CREATE POLICY "admin_message_reads: user can update own"
  ON public.admin_message_reads
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Admin can manage all reads
CREATE POLICY "admin_message_reads: admin can manage all"
  ON public.admin_message_reads
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Weekly Digest columns on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS digest_opt_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_digest_sent timestamptz;

-- 5. Audit Score Cache on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS audit_score int CHECK (audit_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS audit_score_data jsonb,
  ADD COLUMN IF NOT EXISTS audit_score_at timestamptz;
