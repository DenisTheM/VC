-- Add country column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS country text DEFAULT 'CH';
