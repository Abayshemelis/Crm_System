using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Tests;

public class AuditServiceTests
{
    private DbContextOptions<AppDbContext> GetInMemoryOptions()
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
    }

    private async Task SeedRequiredDataAsync(AppDbContext db)
    {
        // Seed EntityTypes
        db.EntityTypes.Add(new EntityType { Name = "Company", TableName = "Companies" });
        db.EntityTypes.Add(new EntityType { Name = "Customer", TableName = "Customers" });
        db.EntityTypes.Add(new EntityType { Name = "Lead", TableName = "Leads" });
        db.EntityTypes.Add(new EntityType { Name = "Opportunity", TableName = "Opportunities" });

        // Seed AuditActionTypes
        db.AuditActionTypes.Add(new AuditActionType { Name = "Create" });
        db.AuditActionTypes.Add(new AuditActionType { Name = "Update" });
        db.AuditActionTypes.Add(new AuditActionType { Name = "Delete" });
        db.AuditActionTypes.Add(new AuditActionType { Name = "Assign" });

        // Seed a test user
        db.Identities.Add(new Identity
        {
            Name = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
            RoleId = 1
        });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task LogFieldChangeAsync_LogsFieldChange_WhenActionTypeExists()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        // Act
        await auditService.LogFieldChangeAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            fieldName: "Email",
            oldValue: "old@example.com",
            newValue: "new@example.com",
            actionTypeName: "Update",
            changedById: changedById);

        // Assert
        var auditLog = await db.AuditLogs.SingleAsync();
        Assert.Equal(entityTypeId, auditLog.EntityTypeId);
        Assert.Equal(1, auditLog.EntityId);
        Assert.Equal("Email", auditLog.FieldName);
        Assert.Equal("old@example.com", auditLog.OldValue);
        Assert.Equal("new@example.com", auditLog.NewValue);
        Assert.Equal("Update", (await db.AuditActionTypes.FindAsync(auditLog.AuditActionTypeId)).Name);
        Assert.Equal(changedById, auditLog.ChangedById);
    }

    [Fact]
    public async Task LogFieldChangeAsync_SkipsLog_WhenActionTypeNotFound()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        // Act
        await auditService.LogFieldChangeAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            fieldName: "Email",
            oldValue: "old@example.com",
            newValue: "new@example.com",
            actionTypeName: "NonExistentAction",
            changedById: changedById);

        // Assert
        var auditLogCount = await db.AuditLogs.CountAsync();
        Assert.Equal(0, auditLogCount);
    }

    [Fact]
    public async Task LogFieldChangesAsync_LogsMultipleChanges_WhenActionTypeExists()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        var changes = new[]
        {
            ("FirstName", "John", "Jane"),
            ("LastName", "Doe", "Smith"),
            ("Email", "old@example.com", "new@example.com")
        };

        // Act
        await auditService.LogFieldChangesAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            changes: changes,
            actionTypeName: "Update",
            changedById: changedById);

        // Assert
        var auditLogs = await db.AuditLogs.ToListAsync();
        Assert.Equal(3, auditLogs.Count);
        
        Assert.Contains(auditLogs, a => a.FieldName == "FirstName" && a.OldValue == "John" && a.NewValue == "Jane");
        Assert.Contains(auditLogs, a => a.FieldName == "LastName" && a.OldValue == "Doe" && a.NewValue == "Smith");
        Assert.Contains(auditLogs, a => a.FieldName == "Email" && a.OldValue == "old@example.com" && a.NewValue == "new@example.com");
    }

    [Fact]
    public async Task LogFieldChangesAsync_SkipsLog_WhenActionTypeNotFound()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        var changes = new[]
        {
            ("FirstName", "John", "Jane")
        };

        // Act
        await auditService.LogFieldChangesAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            changes: changes,
            actionTypeName: "NonExistentAction",
            changedById: changedById);

        // Assert
        var auditLogCount = await db.AuditLogs.CountAsync();
        Assert.Equal(0, auditLogCount);
    }

    [Fact]
    public async Task LogAssignmentAsync_LogsAssignment_WhenRepChanged()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        // Act
        await auditService.LogAssignmentAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            oldRepId: 1,
            newRepId: 2,
            changedById: changedById);

        // Assert
        var auditLog = await db.AuditLogs.SingleAsync();
        Assert.Equal(entityTypeId, auditLog.EntityTypeId);
        Assert.Equal(1, auditLog.EntityId);
        Assert.Equal("AssignedRepId", auditLog.FieldName);
        Assert.Equal("1", auditLog.OldValue);
        Assert.Equal("2", auditLog.NewValue);
        Assert.Equal("Assign", (await db.AuditActionTypes.FindAsync(auditLog.AuditActionTypeId)).Name);
    }

    [Fact]
    public async Task LogAssignmentAsync_SkipsLog_WhenRepNotChanged()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        // Act
        await auditService.LogAssignmentAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            oldRepId: 1,
            newRepId: 1,
            changedById: changedById);

        // Assert
        var auditLogCount = await db.AuditLogs.CountAsync();
        Assert.Equal(0, auditLogCount);
    }

    [Fact]
    public async Task LogDeletionAsync_LogsDeletion_WhenEntityTypeExists()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        // Act
        await auditService.LogDeletionAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            changedById: changedById);

        // Assert
        var auditLog = await db.AuditLogs.SingleAsync();
        Assert.Equal(entityTypeId, auditLog.EntityTypeId);
        Assert.Equal(1, auditLog.EntityId);
        Assert.Null(auditLog.FieldName);
        Assert.Null(auditLog.OldValue);
        Assert.Null(auditLog.NewValue);
        Assert.Equal("Delete", (await db.AuditActionTypes.FindAsync(auditLog.AuditActionTypeId)).Name);
        Assert.Equal(changedById, auditLog.ChangedById);
    }

    [Fact]
    public async Task LogDeletionAsync_SkipsLog_WhenActionTypeNotFound()
    {
        // Arrange
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);
        await SeedRequiredDataAsync(db);

        // Remove the Delete action type
        var deleteAction = await db.AuditActionTypes.SingleAsync(a => a.Name == "Delete");
        db.AuditActionTypes.Remove(deleteAction);
        await db.SaveChangesAsync();

        var auditService = new AuditService(db);
        var entityTypeId = await db.EntityTypes.Where(e => e.Name == "Customer").Select(e => e.EntityTypeId).SingleAsync();
        var changedById = await db.Identities.Select(i => i.IdentityId).SingleAsync();

        // Act
        await auditService.LogDeletionAsync(
            entityTypeId: entityTypeId,
            entityId: 1,
            changedById: changedById);

        // Assert
        var auditLogCount = await db.AuditLogs.CountAsync();
        Assert.Equal(0, auditLogCount);
    }
}