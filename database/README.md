# Database migrations

For an existing Supabase project:

1. Back up the database.
2. Open the Supabase SQL Editor and run `migrations/20261122_admin_moderation.sql` with a database owner account.
3. Deploy/restart the backend after the migration completes. The backend requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; the service-role key must remain server-side.
4. Assign `app_metadata.role = "admin"` to administrator accounts using a trusted Supabase server/admin workflow. Do not set roles from the browser or `user_metadata`.

The migration adds company/listing moderation fields, reports, immutable admin activity records, audit-writing RPCs, and additive RLS policies. It does not drop existing application RLS policies; new restrictive write guards enforce company ownership and active status without replacing existing workflow policies. New listings remain active by default. Existing companies and listings are backfilled to `active`. The exchange-request/listing foreign key is changed to `ON DELETE RESTRICT` only if it does not already have that behavior, so exchange history cannot be cascaded away by deleting a listing. Permanent listing deletion is refused when exchange history exists; hide the listing instead so its history remains intact.

The checked-in `schema.sql` is the reference schema; it cannot confirm policy customizations or schema drift in a live project. Before production, inspect `pg_policies` and the `exchange_requests_listing_id_fkey` definition in the target project, and apply the migration to a backed-up staging copy first.

Run this SQL migration only once. If the SQL editor reports an error, first confirm whether the transaction rolled back before retrying it.

For a new database, run `schema.sql` instead of the migration. The SQL migration must be applied before using the report and admin APIs.

Validate the deployment with `npm test` from `backend/` and `npm run build` from `frontend/`. Those checks do not replace applying and verifying the migration against the target Supabase project.
