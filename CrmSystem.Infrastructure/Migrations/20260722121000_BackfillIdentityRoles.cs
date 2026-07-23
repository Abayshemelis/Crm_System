using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    public partial class BackfillIdentityRoles : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Insert identity-role pairs for existing users where missing.
            migrationBuilder.Sql(@"
                INSERT INTO IdentityRoles (IdentityId, RoleId)
                SELECT i.IdentityId, i.RoleId
                FROM Identities i
                WHERE i.RoleId IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM IdentityRoles ir WHERE ir.IdentityId = i.IdentityId AND ir.RoleId = i.RoleId
                  );
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove identity-role pairs that match the current legacy RoleId mapping.
            migrationBuilder.Sql(@"
                DELETE IdentityRoles
                FROM IdentityRoles ir
                INNER JOIN Identities i ON ir.IdentityId = i.IdentityId
                WHERE ir.RoleId = i.RoleId;
            ");
        }
    }
}
