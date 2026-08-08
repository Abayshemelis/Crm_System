using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomFieldsJson",
                table: "Leads",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomFieldsJson",
                table: "Customers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomFieldsJson",
                table: "Companies",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CustomFieldDefinitions",
                columns: table => new
                {
                    CustomFieldDefinitionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FieldName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FieldType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OptionsJson = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomFieldDefinitions", x => x.CustomFieldDefinitionId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomFieldDefinitions_EntityType_FieldName",
                table: "CustomFieldDefinitions",
                columns: new[] { "EntityType", "FieldName" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomFieldDefinitions");

            migrationBuilder.DropColumn(
                name: "CustomFieldsJson",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "CustomFieldsJson",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "CustomFieldsJson",
                table: "Companies");
        }
    }
}
