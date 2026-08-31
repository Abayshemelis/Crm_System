using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixLeadFkCascadePaths : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Leads_Opportunities_ConvertedOpportunityId",
                table: "Leads");

            migrationBuilder.AddForeignKey(
                name: "FK_Leads_Opportunities_ConvertedOpportunityId",
                table: "Leads",
                column: "ConvertedOpportunityId",
                principalTable: "Opportunities",
                principalColumn: "OpportunityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Leads_Opportunities_ConvertedOpportunityId",
                table: "Leads");

            migrationBuilder.AddForeignKey(
                name: "FK_Leads_Opportunities_ConvertedOpportunityId",
                table: "Leads",
                column: "ConvertedOpportunityId",
                principalTable: "Opportunities",
                principalColumn: "OpportunityId",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
