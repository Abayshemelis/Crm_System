using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateOpportunitySchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "CloseDate",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "ContactId",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Opportunities");

            migrationBuilder.RenameColumn(
                name: "Probability",
                table: "Opportunities",
                newName: "OwnerId");

            migrationBuilder.RenameColumn(
                name: "CreatedByUserId",
                table: "Opportunities",
                newName: "CustomerId");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Opportunities",
                newName: "OpportunityId");

            migrationBuilder.AlterColumn<string>(
                name: "Stage",
                table: "Opportunities",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<DateTime>(
                name: "ActualCloseDate",
                table: "Opportunities",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedValue",
                table: "Opportunities",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpectedCloseDate",
                table: "Opportunities",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Opportunities",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Opportunities_CustomerId",
                table: "Opportunities",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Opportunities_OwnerId",
                table: "Opportunities",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Opportunities_Customers_CustomerId",
                table: "Opportunities",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "CustomerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Opportunities_Users_OwnerId",
                table: "Opportunities",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Opportunities_Customers_CustomerId",
                table: "Opportunities");

            migrationBuilder.DropForeignKey(
                name: "FK_Opportunities_Users_OwnerId",
                table: "Opportunities");

            migrationBuilder.DropIndex(
                name: "IX_Opportunities_CustomerId",
                table: "Opportunities");

            migrationBuilder.DropIndex(
                name: "IX_Opportunities_OwnerId",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "ActualCloseDate",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "EstimatedValue",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "ExpectedCloseDate",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Opportunities");

            migrationBuilder.RenameColumn(
                name: "OwnerId",
                table: "Opportunities",
                newName: "Probability");

            migrationBuilder.RenameColumn(
                name: "CustomerId",
                table: "Opportunities",
                newName: "CreatedByUserId");

            migrationBuilder.RenameColumn(
                name: "OpportunityId",
                table: "Opportunities",
                newName: "Id");

            migrationBuilder.AlterColumn<string>(
                name: "Stage",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.AddColumn<int>(
                name: "AccountId",
                table: "Opportunities",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "Opportunities",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "CloseDate",
                table: "Opportunities",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "ContactId",
                table: "Opportunities",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
