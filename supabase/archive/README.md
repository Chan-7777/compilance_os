# Archived SQL — superseded by the baseline migration

Nothing in this directory is applied by `supabase db reset`. It is kept
only so the history of how the schema was built stays readable.

Until 23 Sept 2026 the base tables — `companies`, `shipments`,
`user_profiles`, `user_settings`, `api_keys` and the rest — were created
by pasting `schema.sql` and the loose `migration_*.sql` files into the
Supabase SQL editor by hand. They were never numbered into
`supabase/migrations/`, so every tracked migration was an `ALTER` against
a table a fresh project did not have. `supabase db reset` on a clean
checkout failed on the first migration:

    Applying migration 20260630000001_rodtep_tracker.sql...
    ERROR: relation "public.shipments" does not exist (SQLSTATE 42P01)

`supabase/migrations/20260101000000_baseline_prod_schema.sql` replaces all
of it. It is a dump of the live project, so it also carries the seven
`companies` columns (`city`, `state`, `pin`, `state_code`,
`port_of_loading`, `gstin`, `address`) that no file here ever created —
they had been added by hand and existed only in production.

## What is in here

| File | Why it is archived |
|---|---|
| `schema.sql` | The original base schema. Folded into the baseline. |
| `migration_*.sql` (13 files) | Hand-pasted, never numbered. Folded into the baseline. |
| `20260630000001_rodtep_tracker.sql` | Applied in production; covered by the baseline. |
| `20260630000002_ca_dashboard.sql` | Applied in production; covered by the baseline. |
| `20260630000003_whatsapp_settings.sql` | Applied in production; covered by the baseline. |
| `20260703000001_export_trackers.sql` | Applied in production; covered by the baseline. |
| `20260906000001_rodtep_recovery_program.sql` | Applied in production; covered by the baseline. |
| `20260910000001_onboarding_completion.sql` | Applied in production; covered by the baseline. |
| `20260915000001_companies_update_policy.sql` | Applied in production (`companies_own_update` exists live); covered by the baseline. |

Three of the loose files — `migration_ca_dashboard.sql`,
`migration_rodtep_tracker.sql`, `migration_whatsapp_settings.sql` — share
a name with a numbered migration but differ in content. They were earlier
drafts. The baseline resolves the ambiguity by recording what production
actually ended up with.

`20260922000001_coo_integration.sql` is not here. It was deleted rather
than archived: it was never applied (`coo_applications` does not exist in
production) and the DGFT Certificate-of-Origin work is frozen.

## Seeds are not archived

`seed_demo_meridian.sql`, `seed_hs_codes.sql` and `seed_hs_tariff_rates.sql`
are data, not schema, and stay in `supabase/`.
