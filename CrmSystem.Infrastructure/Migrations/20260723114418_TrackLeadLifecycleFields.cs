using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TrackLeadLifecycleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // All FK changes for CreatedById/ConvertedById were folded back into
            // AddLeadLifecycleAndInteractivity using idempotent raw SQL to handle
            // the partial-run state. This migration is intentionally a no-op.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: see Up()
        }
    }
}
