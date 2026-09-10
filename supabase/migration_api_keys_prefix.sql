-- Migration: add key_prefix column to api_keys so the underwriting-signal
-- edge function can validate keys by prefix without storing the full key.
-- Run in Supabase SQL Editor.

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_prefix TEXT;

-- Unique index: one prefix per active key (revoked keys keep their row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_prefix
  ON public.api_keys (key_prefix)
  WHERE revoked_at IS NULL;
