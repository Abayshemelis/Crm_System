using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // ── Auth ────────────────────────────────────────────────────────────
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Identity> Identities => Set<Identity>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    // ── Lookup / Reference tables ──────────────────────────────────────────
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<LeadStatus> LeadStatuses => Set<LeadStatus>();
    public DbSet<OpportunityStage> OpportunityStages => Set<OpportunityStage>();
    public DbSet<ActivityType> ActivityTypes => Set<ActivityType>();
    public DbSet<CrmTaskStatus> CrmTaskStatuses => Set<CrmTaskStatus>();
    public DbSet<NotificationType> NotificationTypes => Set<NotificationType>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<ProductStatus> ProductStatuses => Set<ProductStatus>();
    public DbSet<EntityType> EntityTypes => Set<EntityType>();
    public DbSet<AuditActionType> AuditActionTypes => Set<AuditActionType>();

    // ── Core operational entities ──────────────────────────────────────────
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Opportunity> Opportunities => Set<Opportunity>();
    public DbSet<OpportunityLineItem> OpportunityLineItems => Set<OpportunityLineItem>();
    public DbSet<Product> Products => Set<Product>();

    // ── Activity & Tasks ───────────────────────────────────────────────────
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<CrmTask> CrmTasks => Set<CrmTask>();
    public DbSet<StageHistory> StageHistories => Set<StageHistory>();
    public DbSet<Attachment> Attachments => Set<Attachment>();

    public DbSet<IdentityRole> IdentityRoles => Set<IdentityRole>();

    // ── Notifications & Audit ─────────────────────────────────────────────
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── Role ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Role>(e =>
        {
            e.HasKey(r => r.RoleId);
            e.HasIndex(r => r.Name).IsUnique();
            e.Property(r => r.Name).HasMaxLength(30).IsRequired();
            e.Property(r => r.Description).HasMaxLength(255);
        });

        // ── Identity ──────────────────────────────────────────────────────
        modelBuilder.Entity<Identity>(e =>
        {
            e.HasKey(i => i.IdentityId);
            e.HasIndex(i => i.Email).IsUnique();
            e.Property(i => i.Name).HasMaxLength(100).IsRequired();
            e.Property(i => i.Email).HasMaxLength(255).IsRequired();
            e.Property(i => i.PasswordHash).HasMaxLength(255).IsRequired();
            e.HasOne(i => i.Role)
             .WithMany()
             .HasForeignKey(i => i.RoleId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasMany(i => i.IdentityRoles)
             .WithOne(ir => ir.Identity)
             .HasForeignKey(ir => ir.IdentityId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IdentityRole>(e =>
        {
            e.HasKey(ir => new { ir.IdentityId, ir.RoleId });
            e.HasOne(ir => ir.Identity)
             .WithMany(i => i.IdentityRoles)
             .HasForeignKey(ir => ir.IdentityId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ir => ir.Role)
             .WithMany(r => r.IdentityRoles)
             .HasForeignKey(ir => ir.RoleId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── RefreshToken ──────────────────────────────────────────────────
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(rt => rt.TokenHash).IsUnique();
            e.Property(rt => rt.TokenHash).HasMaxLength(255).IsRequired();
            e.HasOne(rt => rt.Identity)
             .WithMany()
             .HasForeignKey(rt => rt.IdentityId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Source (lookup) ───────────────────────────────────────────────
        modelBuilder.Entity<Source>(e =>
        {
            e.HasKey(s => s.SourceId);
            e.HasIndex(s => s.Name).IsUnique();
            e.Property(s => s.Name).HasMaxLength(60).IsRequired();
        });

        // ── LeadStatus (lookup) ───────────────────────────────────────────
        modelBuilder.Entity<LeadStatus>(e =>
        {
            e.HasKey(ls => ls.LeadStatusId);
            e.HasIndex(ls => ls.Name).IsUnique();
            e.Property(ls => ls.Name).HasMaxLength(50).IsRequired();
        });

        // ── OpportunityStage (lookup) ─────────────────────────────────────
        modelBuilder.Entity<OpportunityStage>(e =>
        {
            e.HasKey(os => os.OpportunityStageId);
            e.HasIndex(os => os.Name).IsUnique();
            e.Property(os => os.Name).HasMaxLength(50).IsRequired();
        });

        // ── ActivityType (lookup) ─────────────────────────────────────────
        modelBuilder.Entity<ActivityType>(e =>
        {
            e.HasKey(at => at.ActivityTypeId);
            e.HasIndex(at => at.Name).IsUnique();
            e.Property(at => at.Name).HasMaxLength(50).IsRequired();
            e.Property(at => at.Icon).HasMaxLength(50);
        });

        // ── CrmTaskStatus (lookup) ───────────────────────────────────────
        modelBuilder.Entity<CrmTaskStatus>(e =>
        {
            e.HasKey(ts => ts.CrmTaskStatusId);
            e.HasIndex(ts => ts.Name).IsUnique();
            e.Property(ts => ts.Name).HasMaxLength(50).IsRequired();
        });

        // ── NotificationType (lookup) ─────────────────────────────────────
        modelBuilder.Entity<NotificationType>(e =>
        {
            e.HasKey(nt => nt.NotificationTypeId);
            e.HasIndex(nt => nt.Name).IsUnique();
            e.Property(nt => nt.Name).HasMaxLength(80).IsRequired();
            e.Property(nt => nt.DefaultChannel).HasMaxLength(30);
        });

        // ── ProductCategory (lookup) ───────────────────────────────────────
        modelBuilder.Entity<ProductCategory>(e =>
        {
            e.HasKey(pc => pc.ProductCategoryId);
            e.HasIndex(pc => pc.Name).IsUnique();
            e.Property(pc => pc.Name).HasMaxLength(80).IsRequired();
        });

        // ── ProductStatus (lookup) ─────────────────────────────────────────
        modelBuilder.Entity<ProductStatus>(e =>
        {
            e.HasKey(ps => ps.ProductStatusId);
            e.HasIndex(ps => ps.Name).IsUnique();
            e.Property(ps => ps.Name).HasMaxLength(50).IsRequired();
        });

        // ── EntityType (lookup) ───────────────────────────────────────────
        modelBuilder.Entity<EntityType>(e =>
        {
            e.HasKey(et => et.EntityTypeId);
            e.HasIndex(et => et.Name).IsUnique();
            e.Property(et => et.Name).HasMaxLength(80).IsRequired();
            e.Property(et => et.TableName).HasMaxLength(80).IsRequired();
        });

        // ── AuditActionType (lookup) ──────────────────────────────────────
        modelBuilder.Entity<AuditActionType>(e =>
        {
            e.HasKey(aat => aat.AuditActionTypeId);
            e.HasIndex(aat => aat.Name).IsUnique();
            e.Property(aat => aat.Name).HasMaxLength(50).IsRequired();
        });

        // ── Company ───────────────────────────────────────────────────────
        modelBuilder.Entity<Company>(e =>
        {
            e.HasKey(c => c.CompanyId);
            e.Property(c => c.Name).HasMaxLength(150).IsRequired();
            e.Property(c => c.Industry).HasMaxLength(100);
            e.Property(c => c.CompanySize).HasMaxLength(30);
            e.Property(c => c.Website).HasMaxLength(255);
            e.Property(c => c.Address).HasMaxLength(255);
            e.Property(c => c.Phone).HasMaxLength(50);
            e.Property(c => c.Email).HasMaxLength(255);
            e.HasOne(c => c.Source)
             .WithMany()
             .HasForeignKey(c => c.SourceId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.AssignedRep)
             .WithMany()
             .HasForeignKey(c => c.AssignedRepId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(c => !c.IsDeleted);
        });

        // ── Tag ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Tag>(e =>
        {
            e.HasKey(t => t.TagId);
            e.HasIndex(t => t.Name).IsUnique();
            e.Property(t => t.Name).HasMaxLength(50).IsRequired();
        });

        // ── Customer ──────────────────────────────────────────────────────
        modelBuilder.Entity<Customer>(e =>
        {
            e.HasKey(c => c.CustomerId);
            e.Property(c => c.FirstName).HasMaxLength(100).IsRequired();
            e.Property(c => c.LastName).HasMaxLength(100).IsRequired();
            e.Property(c => c.Email).HasMaxLength(255).IsRequired();
            e.Property(c => c.Phone).HasMaxLength(50);
            e.Property(c => c.JobTitle).HasMaxLength(100);
            e.HasOne(c => c.Source)
             .WithMany()
             .HasForeignKey(c => c.SourceId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.AssignedRep)
             .WithMany()
             .HasForeignKey(c => c.AssignedRepId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.Company)
             .WithMany()
             .HasForeignKey(c => c.CompanyId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(c => !c.IsDeleted);
            e.HasMany(c => c.Tags)
             .WithMany(t => t.Customers)
             .UsingEntity<Dictionary<string, object>>(
                 "CustomerTags",
                 j => j.HasOne<Tag>().WithMany().HasForeignKey("TagId"),
                 j => j.HasOne<Customer>().WithMany().HasForeignKey("CustomerId"));
        });

        // ── Lead ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Lead>(e =>
        {
            e.HasKey(l => l.LeadId);
            e.Property(l => l.FirstName).HasMaxLength(100).IsRequired();
            e.Property(l => l.LastName).HasMaxLength(100).IsRequired();
            e.Property(l => l.Email).HasMaxLength(255);
            e.Property(l => l.Phone).HasMaxLength(50);
            e.Property(l => l.CompanyName).HasMaxLength(150);
            e.Property(l => l.JobTitle).HasMaxLength(100);
            e.Property(l => l.Notes).HasMaxLength(2000);
            e.HasOne(l => l.Source)
             .WithMany()
             .HasForeignKey(l => l.SourceId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(l => l.LeadStatus)
             .WithMany()
             .HasForeignKey(l => l.LeadStatusId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(l => l.AssignedRep)
             .WithMany()
             .HasForeignKey(l => l.AssignedRepId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(l => l.ConvertedCustomer)
             .WithMany()
             .HasForeignKey(l => l.ConvertedCustomerId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(l => l.ConvertedOpportunity)
             .WithMany()
             .HasForeignKey(l => l.ConvertedOpportunityId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(l => l.CreatedBy)
             .WithMany()
             .HasForeignKey(l => l.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(l => l.ConvertedBy)
             .WithMany()
             .HasForeignKey(l => l.ConvertedById)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasQueryFilter(l => !l.IsDeleted);
        });

        // ── Opportunity ───────────────────────────────────────────────────
        modelBuilder.Entity<Opportunity>(e =>
        {
            e.HasKey(o => o.OpportunityId);
            e.Property(o => o.Title).HasMaxLength(150).IsRequired();
            e.Property(o => o.Description).HasMaxLength(2000);
            e.Property(o => o.EstimatedValue).HasColumnType("decimal(12,2)").IsRequired();
            e.HasOne(o => o.Customer)
             .WithMany()
             .HasForeignKey(o => o.CustomerId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(o => o.OpportunityStage)
             .WithMany()
             .HasForeignKey(o => o.OpportunityStageId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Owner)
             .WithMany()
             .HasForeignKey(o => o.OwnerId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── OpportunityLineItem ───────────────────────────────────────────
        modelBuilder.Entity<OpportunityLineItem>(e =>
        {
            e.HasKey(li => li.LineItemId);
            e.Property(li => li.UnitPrice).HasColumnType("decimal(12,2)").IsRequired();
            e.Property(li => li.DiscountPercent).HasColumnType("decimal(5,2)");
            e.Ignore(li => li.TotalPrice); // Computed, not stored in DB
            e.HasOne(li => li.Opportunity)
             .WithMany(o => o.LineItems)
             .HasForeignKey(li => li.OpportunityId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(li => li.Product)
             .WithMany()
             .HasForeignKey(li => li.ProductId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Product ───────────────────────────────────────────────────────
        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(p => p.ProductId);
            e.Property(p => p.Name).HasMaxLength(150).IsRequired();
            e.Property(p => p.SKU).HasMaxLength(80);
            e.Property(p => p.Description).HasMaxLength(1000);
            e.Property(p => p.Price).HasColumnType("decimal(12,2)").IsRequired();
            e.Property(p => p.Cost).HasColumnType("decimal(12,2)");
            e.HasOne(p => p.ProductCategory)
             .WithMany()
             .HasForeignKey(p => p.ProductCategoryId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.ProductStatus)
             .WithMany()
             .HasForeignKey(p => p.ProductStatusId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Activity ──────────────────────────────────────────────────────
        modelBuilder.Entity<Activity>(e =>
        {
            e.HasKey(a => a.ActivityId);
            e.Property(a => a.Subject).HasMaxLength(200).IsRequired();
            e.Property(a => a.Description).HasMaxLength(4000);
            e.HasOne(a => a.Customer)
             .WithMany()
             .HasForeignKey(a => a.CustomerId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(a => a.Opportunity)
             .WithMany()
             .HasForeignKey(a => a.OpportunityId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(a => a.Lead)
             .WithMany(l => l.Activities)
             .HasForeignKey(a => a.LeadId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(a => a.ActivityType)
             .WithMany()
             .HasForeignKey(a => a.ActivityTypeId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.CreatedBy)
             .WithMany()
             .HasForeignKey(a => a.CreatedById)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasMany(a => a.Tasks)
             .WithOne(t => t.Activity)
             .HasForeignKey(t => t.ActivityId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── CrmTask ───────────────────────────────────────────────────────
        modelBuilder.Entity<CrmTask>(e =>
        {
            e.HasKey(t => t.CrmTaskId);
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.Description).HasMaxLength(2000);
            e.HasOne(t => t.CrmTaskStatus)
             .WithMany()
             .HasForeignKey(t => t.CrmTaskStatusId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Customer)
             .WithMany()
             .HasForeignKey(t => t.CustomerId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.Opportunity)
             .WithMany()
             .HasForeignKey(t => t.OpportunityId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(t => t.Lead)
             .WithMany(l => l.Tasks)
             .HasForeignKey(t => t.LeadId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.Activity)
             .WithMany(a => a.Tasks)
             .HasForeignKey(t => t.ActivityId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.AssignedTo)
             .WithMany()
             .HasForeignKey(t => t.AssignedToId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.CreatedBy)
             .WithMany()
             .HasForeignKey(t => t.CreatedById)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StageHistory ──────────────────────────────────────────────────
        modelBuilder.Entity<StageHistory>(e =>
        {
            e.HasKey(sh => sh.StageHistoryId);
            e.HasOne(sh => sh.Opportunity)
             .WithMany()
             .HasForeignKey(sh => sh.OpportunityId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(sh => sh.OldStage)
             .WithMany()
             .HasForeignKey(sh => sh.OldStageId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(sh => sh.NewStage)
             .WithMany()
             .HasForeignKey(sh => sh.NewStageId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(sh => sh.ChangedBy)
             .WithMany()
             .HasForeignKey(sh => sh.ChangedById)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Attachment ────────────────────────────────────────────────────
        modelBuilder.Entity<Attachment>(e =>
        {
            e.HasKey(a => a.AttachmentId);
            e.Property(a => a.FileName).HasMaxLength(255).IsRequired();
            e.Property(a => a.FileUrl).HasMaxLength(1000).IsRequired();
            e.Property(a => a.ContentType).HasMaxLength(100);
            e.HasOne(a => a.Customer)
             .WithMany()
             .HasForeignKey(a => a.CustomerId)
             .OnDelete(DeleteBehavior.NoAction);  // NoAction to avoid cycle via Customer→Opportunity cascade
            e.HasOne(a => a.Company)
             .WithMany()
             .HasForeignKey(a => a.CompanyId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(a => a.Opportunity)
             .WithMany()
             .HasForeignKey(a => a.OpportunityId)
             .OnDelete(DeleteBehavior.NoAction);  // NoAction: Customer→Opportunity(Cascade) already covers this path
            e.HasOne(a => a.UploadedBy)
             .WithMany()
             .HasForeignKey(a => a.UploadedById)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Notification ──────────────────────────────────────────────────
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.NotificationId);
            e.Property(n => n.Message).HasMaxLength(500).IsRequired();
            e.HasOne(n => n.Identity)
             .WithMany()
             .HasForeignKey(n => n.IdentityId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.NotificationType)
             .WithMany()
             .HasForeignKey(n => n.NotificationTypeId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(n => n.RelatedTask)
             .WithMany()
             .HasForeignKey(n => n.RelatedTaskId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(n => n.RelatedOpportunity)
             .WithMany()
             .HasForeignKey(n => n.RelatedOpportunityId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        // ── AuditLog ──────────────────────────────────────────────────────
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasKey(al => al.AuditLogId);
            e.Property(al => al.FieldName).HasMaxLength(100);
            e.Property(al => al.OldValue).HasMaxLength(2000);
            e.Property(al => al.NewValue).HasMaxLength(2000);
            e.HasOne(al => al.EntityType)
             .WithMany()
             .HasForeignKey(al => al.EntityTypeId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(al => al.AuditActionType)
             .WithMany()
             .HasForeignKey(al => al.AuditActionTypeId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(al => al.ChangedBy)
             .WithMany()
             .HasForeignKey(al => al.ChangedById)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(al => !al.IsDeleted);
        });
    }
}