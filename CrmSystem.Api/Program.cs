using System.Text;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using CrmSystem.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IOpportunityService, OpportunityService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var response = ApiErrorResponse.FromModelState(
            StatusCodes.Status422UnprocessableEntity,
            "Validation failed",
            context.ModelState);

        return new UnprocessableEntityObjectResult(response);
    };
});

var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RepOrAbove", policy =>
        policy.RequireRole("SalesRep", "Manager", "Admin"));

    options.AddPolicy("ManagerOrAbove", policy =>
        policy.RequireRole("Manager", "Admin"));

    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseStaticFiles();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

    // ── Roles ────────────────────────────────────────────────────────────
    var roleSeeds = new[] {
        ("Admin", "System Administrator"),
        ("Manager", "Sales Team Manager"),
        ("SalesRep", "Sales Representative")
    };
    foreach (var (name, desc) in roleSeeds)
    {
        if (!await db.Roles.AnyAsync(r => r.Name == name))
            db.Roles.Add(new Role { Name = name, Description = desc, IsSystemRole = true });
    }
    await db.SaveChangesAsync();

    // ── Sources ──────────────────────────────────────────────────────────
    var sourceSeeds = new[] { "Referral", "Website", "Cold Call", "Social Media", "Trade Show", "Advertisement", "Email Campaign", "Partner", "Other" };
    foreach (var s in sourceSeeds)
    {
        if (!await db.Sources.AnyAsync(x => x.Name == s))
            db.Sources.Add(new Source { Name = s, IsActive = true });
    }
    await db.SaveChangesAsync();

    // ── LeadStatuses ─────────────────────────────────────────────────────
    var leadStatusSeeds = new (string Name, int Order, bool Terminal)[] {
        ("New", 1, false), ("Contacted", 2, false), ("Qualified", 3, false),
        ("Proposal Sent", 4, false), ("Converted", 5, true), ("Lost", 6, true)
    };
    foreach (var (name, order, terminal) in leadStatusSeeds)
    {
        if (!await db.LeadStatuses.AnyAsync(x => x.Name == name))
            db.LeadStatuses.Add(new LeadStatus { Name = name, SortOrder = order, IsTerminal = terminal });
    }
    await db.SaveChangesAsync();

    // ── OpportunityStages ─────────────────────────────────────────────────
    var stageSeeds = new (string Name, int Order, bool IsWon, bool IsLost)[] {
        ("New", 1, false, false), ("Qualified", 2, false, false),
        ("Proposal", 3, false, false), ("Negotiation", 4, false, false),
        ("Won", 5, true, false), ("Lost", 6, false, true)
    };
    foreach (var (name, order, isWon, isLost) in stageSeeds)
    {
        if (!await db.OpportunityStages.AnyAsync(x => x.Name == name))
            db.OpportunityStages.Add(new OpportunityStage { Name = name, SortOrder = order, IsWon = isWon, IsLost = isLost });
    }
    await db.SaveChangesAsync();

    // ── ActivityTypes ─────────────────────────────────────────────────────
    var activityTypeSeeds = new[] { ("Call", "phone"), ("Email", "mail"), ("Meeting", "users"), ("Note", "file-text"), ("Demo", "monitor"), ("Follow-Up", "repeat") };
    foreach (var (name, icon) in activityTypeSeeds)
    {
        if (!await db.ActivityTypes.AnyAsync(x => x.Name == name))
            db.ActivityTypes.Add(new ActivityType { Name = name, Icon = icon });
    }
    await db.SaveChangesAsync();

    // ── CrmTaskStatuses ───────────────────────────────────────────────────
    var taskStatusSeeds = new (string Name, bool Terminal)[] {
        ("Pending", false), ("In Progress", false), ("Completed", true), ("Cancelled", true)
    };
    foreach (var (name, terminal) in taskStatusSeeds)
    {
        if (!await db.CrmTaskStatuses.AnyAsync(x => x.Name == name))
            db.CrmTaskStatuses.Add(new CrmTaskStatus { Name = name, IsTerminal = terminal });
    }
    await db.SaveChangesAsync();

    // ── NotificationTypes ─────────────────────────────────────────────────
    var notifTypeSeeds = new[] { ("TaskDue", "InApp"), ("TaskAssigned", "InApp"), ("OpportunityWon", "InApp"), ("OpportunityLost", "InApp"), ("LeadAssigned", "InApp"), ("MentionedInNote", "InApp") };
    foreach (var (name, channel) in notifTypeSeeds)
    {
        if (!await db.NotificationTypes.AnyAsync(x => x.Name == name))
            db.NotificationTypes.Add(new NotificationType { Name = name, DefaultChannel = channel });
    }
    await db.SaveChangesAsync();

    // ── ProductCategories ─────────────────────────────────────────────────
    var prodCatSeeds = new[] { "Software", "Hardware", "Services", "Consulting", "Subscription", "Support", "Other" };
    foreach (var s in prodCatSeeds)
    {
        if (!await db.ProductCategories.AnyAsync(x => x.Name == s))
            db.ProductCategories.Add(new ProductCategory { Name = s });
    }
    await db.SaveChangesAsync();

    // ── ProductStatuses ───────────────────────────────────────────────────
    var prodStatusSeeds = new (string Name, bool Selectable)[] {
        ("Active", true), ("Inactive", false), ("Discontinued", false)
    };
    foreach (var (name, sel) in prodStatusSeeds)
    {
        if (!await db.ProductStatuses.AnyAsync(x => x.Name == name))
            db.ProductStatuses.Add(new ProductStatus { Name = name, IsSelectable = sel });
    }
    await db.SaveChangesAsync();

    // ── EntityTypes ───────────────────────────────────────────────────────
    var entityTypeSeeds = new[] { ("Customer", "Customers"), ("Company", "Companies"), ("Lead", "Leads"), ("Opportunity", "Opportunities"), ("Product", "Products"), ("Activity", "Activities"), ("CrmTask", "CrmTasks") };
    foreach (var (name, table) in entityTypeSeeds)
    {
        if (!await db.EntityTypes.AnyAsync(x => x.Name == name))
            db.EntityTypes.Add(new EntityType { Name = name, TableName = table });
    }
    await db.SaveChangesAsync();

    // ── AuditActionTypes ──────────────────────────────────────────────────
    var auditActionSeeds = new[] { "Create", "Update", "Delete", "StatusChange", "StageChange", "Assign", "Convert" };
    foreach (var s in auditActionSeeds)
    {
        if (!await db.AuditActionTypes.AnyAsync(x => x.Name == s))
            db.AuditActionTypes.Add(new AuditActionType { Name = s });
    }
    await db.SaveChangesAsync();

    // ── Default Admin Identity ────────────────────────────────────────────
    var adminRole     = await db.Roles.SingleAsync(r => r.Name == "Admin");
    var adminEmail    = "abayshemelisshiferaw@gmail.com";
    var adminPassword = "admin123";

    // Remove stale admin accounts that no longer match the target email
    var staleAdmins = await db.Identities
        .Where(i => i.RoleId == adminRole.RoleId && i.Email != adminEmail)
        .ToListAsync();
    if (staleAdmins.Any())
    {
        db.Identities.RemoveRange(staleAdmins);
        await db.SaveChangesAsync();
    }

    if (!await db.Identities.AnyAsync(i => i.Email == adminEmail))
    {
        db.Identities.Add(new Identity
        {
            Name         = "Admin",
            Email        = adminEmail,
            RoleId       = adminRole.RoleId,
            PasswordHash = passwordHasher.Hash(adminPassword)
        });
        await db.SaveChangesAsync();
    }
}
app.Run();
