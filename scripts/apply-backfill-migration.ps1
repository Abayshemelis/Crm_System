<#
Apply BackfillIdentityRoles migration safely.

Usage examples:
  # With default project settings (uses connection in appsettings of CrmSystem.Api)
  .\apply-backfill-migration.ps1

  # Provide a SQL Server connection string to run verification and optional backup
  .\apply-backfill-migration.ps1 -ConnectionString "Server=...;Database=...;User Id=...;Password=...;"

This script does NOT modify remote servers by itself — it runs local commands. When running on a staging host, run it from the repo checkout on that host.
#>

param(
    [string] $ConnectionString = ''
)

Write-Host "Starting backfill migration run"

if ($ConnectionString) {
    Write-Host "Connection string provided — attempting a DB backup (if sqlcmd is available)"
    $timestamp = (Get-Date).ToString('yyyyMMddHHmmss')
    $backupFile = "DbBackup_$timestamp.bak"
    try {
        if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
            Write-Host "Running backup using sqlcmd..."
            # Extract database name from connection string (best-effort)
            $db = ($ConnectionString -split ';' | Where-Object { $_ -match '^Database=' }) -replace '^Database=' -join ''
            if ($db) {
                $sql = "BACKUP DATABASE [$db] TO DISK = N'$backupFile' WITH INIT;"
                sqlcmd -Q $sql -S ("(local)") -i $null -b -C -E -U $null 2>$null
                Write-Host "Backup requested (please verify $backupFile on the server)."
            } else {
                Write-Host "Could not determine database name from connection string — skipping automated backup."
            }
        } else {
            Write-Host "sqlcmd not found — please take a manual backup before proceeding." -ForegroundColor Yellow
        }
    } catch {
        Write-Warning "Backup step failed or skipped: $_"
    }
}

Write-Host "Running EF Core migrations: will apply any pending migrations (including BackfillIdentityRoles)"
dotnet build
dotnet ef database update --project CrmSystem.Infrastructure --startup-project CrmSystem.Api

if ($ConnectionString) {
    Write-Host "Running verification SQL to detect missing IdentityRoles mappings"
    $verifySql = @"
SELECT COUNT(1) AS MissingMappings
FROM Identities i
WHERE i.RoleId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM IdentityRoles ir WHERE ir.IdentityId = i.IdentityId AND ir.RoleId = i.RoleId
  );
"@
    if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
        sqlcmd -Q $verifySql -S ("(local)")
    } else {
        Write-Host "sqlcmd not available — run the following SQL against your staging DB to verify:" -ForegroundColor Yellow
        Write-Host $verifySql
    }
}

Write-Host "Migration run complete. Please review logs and verification results before promoting to production."
