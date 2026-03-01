-- Migration 037: Add contact_phone to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_phone text;
