-- ============================================================
-- Migration: Rate limiting for expensive edge functions
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fn_name     TEXT NOT NULL,
  window_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count       INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fn_name, window_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (user_id, fn_name, window_date);

-- Clean up old windows automatically (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- RLS: users can only see their own rows
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_self" ON public.rate_limits
  FOR ALL USING (user_id = auth.uid());

-- Service role full access (edge functions use service role)
CREATE POLICY "rate_limits_service" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
