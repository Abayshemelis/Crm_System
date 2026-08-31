using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityIdToCrmTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ActivityId",
                table: "CrmTasks",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CrmTasks_ActivityId",
                table: "CrmTasks",
                column: "ActivityId");

            migrationBuilder.AddForeignKey(
                name: "FK_CrmTasks_Activities_ActivityId",
                table: "CrmTasks",
                column: "ActivityId",
                principalTable: "Activities",
                principalColumn: "ActivityId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CrmTasks_Activities_ActivityId",
                table: "CrmTasks");

            migrationBuilder.DropIndex(
                name: "IX_CrmTasks_ActivityId",
                table: "CrmTasks");

            migrationBuilder.DropColumn(
                name: "ActivityId",
                table: "CrmTasks");
        }
    }
}
