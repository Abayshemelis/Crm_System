using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrmSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadLifecycleAndInteractivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: Columns, indexes, and the Activities/CrmTasks FKs were applied in a prior
            // partial run that failed before committing to __EFMigrationsHistory.
            // We use IF NOT EXISTS guards via raw SQL for idempotency.

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Leads') AND name = 'ConvertedAt')
                    ALTER TABLE [Leads] ADD [ConvertedAt] datetime2 NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Leads') AND name = 'ConvertedById')
                    ALTER TABLE [Leads] ADD [ConvertedById] int NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Leads') AND name = 'ConvertedOpportunityId')
                    ALTER TABLE [Leads] ADD [ConvertedOpportunityId] int NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Leads') AND name = 'CreatedById')
                    ALTER TABLE [Leads] ADD [CreatedById] int NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('CrmTasks') AND name = 'LeadId')
                    ALTER TABLE [CrmTasks] ADD [LeadId] int NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Activities') AND name = 'LeadId')
                    ALTER TABLE [Activities] ADD [LeadId] int NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Leads') AND name = 'IX_Leads_ConvertedById')
                    CREATE INDEX [IX_Leads_ConvertedById] ON [Leads] ([ConvertedById]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Leads') AND name = 'IX_Leads_ConvertedOpportunityId')
                    CREATE INDEX [IX_Leads_ConvertedOpportunityId] ON [Leads] ([ConvertedOpportunityId]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Leads') AND name = 'IX_Leads_CreatedById')
                    CREATE INDEX [IX_Leads_CreatedById] ON [Leads] ([CreatedById]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('CrmTasks') AND name = 'IX_CrmTasks_LeadId')
                    CREATE INDEX [IX_CrmTasks_LeadId] ON [CrmTasks] ([LeadId]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Activities') AND name = 'IX_Activities_LeadId')
                    CREATE INDEX [IX_Activities_LeadId] ON [Activities] ([LeadId]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Activities_Leads_LeadId')
                    ALTER TABLE [Activities] ADD CONSTRAINT [FK_Activities_Leads_LeadId] FOREIGN KEY ([LeadId]) REFERENCES [Leads] ([LeadId]) ON DELETE SET NULL;");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CrmTasks_Leads_LeadId')
                    ALTER TABLE [CrmTasks] ADD CONSTRAINT [FK_CrmTasks_Leads_LeadId] FOREIGN KEY ([LeadId]) REFERENCES [Leads] ([LeadId]) ON DELETE SET NULL;");

            // Use NO ACTION (not SET NULL) for identity FKs to avoid cascade cycle (Error 1785)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Leads_Identities_ConvertedById')
                    ALTER TABLE [Leads] ADD CONSTRAINT [FK_Leads_Identities_ConvertedById] FOREIGN KEY ([ConvertedById]) REFERENCES [Identities] ([IdentityId]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Leads_Identities_CreatedById')
                    ALTER TABLE [Leads] ADD CONSTRAINT [FK_Leads_Identities_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [Identities] ([IdentityId]);");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Leads_Opportunities_ConvertedOpportunityId')
                    ALTER TABLE [Leads] ADD CONSTRAINT [FK_Leads_Opportunities_ConvertedOpportunityId] FOREIGN KEY ([ConvertedOpportunityId]) REFERENCES [Opportunities] ([OpportunityId]);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Activities_Leads_LeadId",
                table: "Activities");

            migrationBuilder.DropForeignKey(
                name: "FK_CrmTasks_Leads_LeadId",
                table: "CrmTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Leads_Identities_ConvertedById",
                table: "Leads");

            migrationBuilder.DropForeignKey(
                name: "FK_Leads_Identities_CreatedById",
                table: "Leads");

            migrationBuilder.DropForeignKey(
                name: "FK_Leads_Opportunities_ConvertedOpportunityId",
                table: "Leads");

            migrationBuilder.DropIndex(
                name: "IX_Leads_ConvertedById",
                table: "Leads");

            migrationBuilder.DropIndex(
                name: "IX_Leads_ConvertedOpportunityId",
                table: "Leads");

            migrationBuilder.DropIndex(
                name: "IX_Leads_CreatedById",
                table: "Leads");

            migrationBuilder.DropIndex(
                name: "IX_CrmTasks_LeadId",
                table: "CrmTasks");

            migrationBuilder.DropIndex(
                name: "IX_Activities_LeadId",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "ConvertedAt",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "ConvertedById",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "ConvertedOpportunityId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LeadId",
                table: "CrmTasks");

            migrationBuilder.DropColumn(
                name: "LeadId",
                table: "Activities");
        }
    }
}
