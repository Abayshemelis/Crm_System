using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadIdToAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LeadId",
                table: "Attachments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_LeadId",
                table: "Attachments",
                column: "LeadId");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Leads_LeadId",
                table: "Attachments",
                column: "LeadId",
                principalTable: "Leads",
                principalColumn: "LeadId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Leads_LeadId",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_LeadId",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "LeadId",
                table: "Attachments");
        }
    }
}
