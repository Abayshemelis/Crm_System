using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManagerIdToIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ManagerId",
                table: "Identities",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Identities_ManagerId",
                table: "Identities",
                column: "ManagerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Identities_Identities_ManagerId",
                table: "Identities",
                column: "ManagerId",
                principalTable: "Identities",
                principalColumn: "IdentityId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Identities_Identities_ManagerId",
                table: "Identities");

            migrationBuilder.DropIndex(
                name: "IX_Identities_ManagerId",
                table: "Identities");

            migrationBuilder.DropColumn(
                name: "ManagerId",
                table: "Identities");
        }
    }
}
