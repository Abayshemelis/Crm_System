using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadWorkflowFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                table: "Leads",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeadScore",
                table: "Leads",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "LostReason",
                table: "Leads",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NextFollowUpAssignedToId",
                table: "Leads",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextFollowUpDate",
                table: "Leads",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextFollowUpNotes",
                table: "Leads",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextFollowUpType",
                table: "Leads",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Leads",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Leads_NextFollowUpAssignedToId",
                table: "Leads",
                column: "NextFollowUpAssignedToId");

            migrationBuilder.AddForeignKey(
                name: "FK_Leads_Identities_NextFollowUpAssignedToId",
                table: "Leads",
                column: "NextFollowUpAssignedToId",
                principalTable: "Identities",
                principalColumn: "IdentityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Leads_Identities_NextFollowUpAssignedToId",
                table: "Leads");

            migrationBuilder.DropIndex(
                name: "IX_Leads_NextFollowUpAssignedToId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LeadScore",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LostReason",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "NextFollowUpAssignedToId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "NextFollowUpDate",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "NextFollowUpNotes",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "NextFollowUpType",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Leads");
        }
    }
}
