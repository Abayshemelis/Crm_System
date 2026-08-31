using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260821120000_AddDualPartySignaturesToContract")]
    /// <inheritdoc />
    public partial class AddDualPartySignaturesToContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanySignatureDataUrl",
                table: "Contracts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanySignedByName",
                table: "Contracts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CompanySignedAt",
                table: "Contracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerSignatureDataUrl",
                table: "Contracts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerSignedByName",
                table: "Contracts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CustomerSignedAt",
                table: "Contracts",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanySignatureDataUrl",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "CompanySignedByName",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "CompanySignedAt",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "CustomerSignatureDataUrl",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "CustomerSignedByName",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "CustomerSignedAt",
                table: "Contracts");
        }
    }
}
