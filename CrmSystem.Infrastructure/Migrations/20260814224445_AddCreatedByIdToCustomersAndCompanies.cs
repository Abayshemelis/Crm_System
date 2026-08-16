using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedByIdToCustomersAndCompanies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "Customers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "Companies",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_CreatedById",
                table: "Customers",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_CreatedById",
                table: "Companies",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Identities_CreatedById",
                table: "Companies",
                column: "CreatedById",
                principalTable: "Identities",
                principalColumn: "IdentityId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Identities_CreatedById",
                table: "Customers",
                column: "CreatedById",
                principalTable: "Identities",
                principalColumn: "IdentityId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Companies_Identities_CreatedById",
                table: "Companies");

            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Identities_CreatedById",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_CreatedById",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Companies_CreatedById",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Companies");
        }
    }
}
