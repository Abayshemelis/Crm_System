<#
Verify that all existing users with a legacy RoleId have corresponding IdentityRoles entries.

Usage:
  .\verify-backfill.ps1 -ConnectionString "Server=...;Database=...;User Id=...;Password=...;"
#>

param(
    [Parameter(Mandatory=$true)]
    [string] $ConnectionString
)

$verifySql = @"
SELECT i.IdentityId, i.Email, i.RoleId
FROM Identities i
WHERE i.RoleId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM IdentityRoles ir WHERE ir.IdentityId = i.IdentityId AND ir.RoleId = i.RoleId
  );
"@

if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
    sqlcmd -Q $verifySql
} else {
    Write-Host "sqlcmd not found. Run this SQL manually against your DB:"
    Write-Host $verifySql
}
