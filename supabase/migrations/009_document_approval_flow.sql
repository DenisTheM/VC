-- Migration 009: Document Approval Flow
-- Adds audit columns and RLS policy so clients can approve documents

-- 1. Add approval audit columns
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 2. RLS policy: clients can approve their own org's documents
--    Restricted to: only status change from 'review' → 'current'
--    Also sets approved_by and approved_at
CREATE POLICY "documents: clients can approve own org docs"
  ON public.documents
  FOR UPDATE
  USING (
    -- Must be member of the document's organization
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = documents.organization_id
    )
    -- Document must currently be in 'review' status
    AND documents.status = 'review'
  )
  WITH CHECK (
    -- Can only set status to 'current'
    status = 'current'
  );

-- 3. Mark existing 'current' documents as approved by system
--    (backfill for audit consistency)
UPDATE public.documents
  SET approved_at = updated_at
  WHERE status = 'current' AND approved_at IS NULL;
