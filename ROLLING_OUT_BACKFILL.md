**Backfill IdentityRoles rollout guide**

Goal: safely apply the BackfillIdentityRoles EF migration to staging/production and verify results.

Preconditions
- Ensure a recent database backup is available.
- Ensure deployment host has the repo checkout and `dotnet` & `dotnet-ef` installed.

Steps (recommended)
1. On the staging host, pull this repository and checkout the same commit as your staging app.
2. Take a full DB backup (or snapshot). If using SQL Server, `sqlcmd` can be used; otherwise use your provider's backup tooling.
3. Run the script: `powershell -ExecutionPolicy Bypass -File scripts\apply-backfill-migration.ps1 -ConnectionString "Server=...;Database=...;User Id=...;Password=...;"`
   - The script runs `dotnet ef database update` for the Infrastructure project. It will not automatically run on other environments.
4. Verify results:
   - Run `scripts\verify-backfill.ps1 -ConnectionString "..."` or execute the SQL below to confirm no missing mappings:

```sql
SELECT COUNT(1) AS MissingMappings
FROM Identities i
WHERE i.RoleId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM IdentityRoles ir WHERE ir.IdentityId = i.IdentityId AND ir.RoleId = i.RoleId
  );
```

5. Spot-check a few users and ensure the `IdentityRoles` rows were inserted and that the app can read multiple roles for users.

6. Monitor logs and audit entries for unexpected assignments.

Rollback
- If you need to roll back, restore the DB from the backup taken in step 2.

Notes
- This repo includes the migration `CrmSystem.Infrastructure/Migrations/20260722121000_BackfillIdentityRoles.cs` which is idempotent (inserts missing mappings only).
- I did NOT run any migration against your staging/production DB; this guide and scripts let your operator run them safely.
