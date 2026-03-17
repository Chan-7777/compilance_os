-- HS Codes table — seeded from HS 2022 nomenclature (5,614 six-digit codes)
create table if not exists public.hs_codes (
  hs_code   text primary key,          -- 6-digit formatted as XXXX.XX e.g. "0904.21"
  description text not null,
  section   text,                       -- Roman numeral section e.g. "II"
  created_at timestamptz default now()
);

-- Full-text search index on description
create index if not exists hs_codes_description_fts
  on public.hs_codes
  using gin(to_tsvector('english', description));

-- Prefix search on hs_code
create index if not exists hs_codes_code_idx
  on public.hs_codes (hs_code text_pattern_ops);

-- RLS: anyone authenticated can read
alter table public.hs_codes enable row level security;

create policy "Allow authenticated read"
  on public.hs_codes for select
  to authenticated
  using (true);
