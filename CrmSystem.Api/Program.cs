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
using IAuditService = CrmSystem.Infrastructure.Services.IAuditService;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://172.25.64.1:5173", "http://172.31.224.1:5173", "http://192.168.78.1:5173", "http://192.168.111.1:5173", "http://192.168.123.12:5173", "http://192.168.91.12:5173", "http://192.168.242.12:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://172.25.64.1:5174", "http://172.31.224.1:5174", "http://192.168.78.1:5174", "http://192.168.111.1:5174", "http://192.168.123.12:5174", "http://192.168.91.12:5174", "http://192.168.242.12:5174")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var useInMemoryDatabase = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (useInMemoryDatabase)
    {
        options.UseInMemoryDatabase("CrmSystemDb");
    }
    else
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            options.UseInMemoryDatabase("CrmSystemDb");
        }
        else
        {
            options.UseSqlServer(connectionString);
        }
    }
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IOpportunityService, OpportunityService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHostedService<NotificationBackgroundService>();

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

var jwtSigningKey = builder.Configuration["Jwt:SigningKey"] ?? "development-signing-key-1234567890";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CrmSystem.Api";

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

// Apply pending migrations on startup
if (!useInMemoryDatabase)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Ensure CORS middleware runs before static files so browser requests for
// /uploads/* receive the CORS headers and can be fetched from the frontend dev server.
app.UseCors("AllowFrontend");

// Serve static files with custom response headers so uploaded PDFs can be
// embedded in the frontend preview modal. Use OnPrepareResponse to adjust
// headers for each static file response (precise and reliable).
app.UseStaticFiles(new Microsoft.AspNetCore.Builder.StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var headers = ctx.Context.Response.Headers;

        // Remove X-Frame-Options to allow embedding in iframes/object tags.
        if (headers.ContainsKey("X-Frame-Options"))
            headers.Remove("X-Frame-Options");

        // If the file is a PDF, prefer inline disposition so browsers render it.
        var contentType = ctx.Context.Response.ContentType ?? string.Empty;
        if (contentType.StartsWith("application/pdf", StringComparison.OrdinalIgnoreCase))
        {
            if (!headers.ContainsKey("Content-Disposition"))
            {
                // Include a filename to help browsers; keep it simple and safe.
                var fileName = System.IO.Path.GetFileName(ctx.File.PhysicalPath) ?? "file.pdf";
                headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            }
        }

        // Expose the file to the frontend dev server origin (CORS for static files).
        // This mirrors the AllowFrontend policy for requests that hit static files.
        if (!headers.ContainsKey("Access-Control-Allow-Origin"))
        {
            headers["Access-Control-Allow-Origin"] = "http://localhost:5173";
        }
    }
});
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
        ("Closing", 5, false, false), ("Won", 6, true, false), ("Lost", 7, false, true)
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
    var notifTypeSeeds = new[] { ("TaskDue", "InApp"), ("TaskOverdue", "InApp"), ("TaskAssigned", "InApp"), ("OpportunityWon", "InApp"), ("OpportunityLost", "InApp"), ("OpportunityStalled", "InApp"), ("LeadAssigned", "InApp"), ("MentionedInNote", "InApp") };
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

    // ── Products ───────────────────────────────────────────────────────
    var activeStatus = await db.ProductStatuses.SingleAsync(x => x.Name == "Active");
    var softwareCategory = await db.ProductCategories.SingleAsync(x => x.Name == "Software");
    var hardwareCategory = await db.ProductCategories.SingleAsync(x => x.Name == "Hardware");
    var servicesCategory = await db.ProductCategories.SingleAsync(x => x.Name == "Services");

    if (!await db.Products.AnyAsync())
    {
        db.Products.AddRange(
            new Product { Name = "Basic Software License", SKU = "SW-001", Description = "Standard software license", ProductCategoryId = softwareCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 1000, Cost = 200, StockQuantity = 100 },
            new Product { Name = "Premium Software License", SKU = "SW-002", Description = "Premium software license with advanced features", ProductCategoryId = softwareCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 2500, Cost = 500, StockQuantity = 50 },
            new Product { Name = "Enterprise Software License", SKU = "SW-003", Description = "Enterprise software license with unlimited users", ProductCategoryId = softwareCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 10000, Cost = 2000, StockQuantity = 20 },
            new Product { Name = "Laptop Computer", SKU = "HW-001", Description = "Standard business laptop", ProductCategoryId = hardwareCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 1500, Cost = 1000, StockQuantity = 30 },
            new Product { Name = "Desktop Computer", SKU = "HW-002", Description = "Business desktop computer", ProductCategoryId = hardwareCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 1200, Cost = 800, StockQuantity = 25 },
            new Product { Name = "Technical Support Package", SKU = "SVC-001", Description = "Annual technical support package", ProductCategoryId = servicesCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 500, Cost = 100, StockQuantity = 100 },
            new Product { Name = "Consulting Services", SKU = "SVC-002", Description = "Hourly consulting services", ProductCategoryId = servicesCategory.ProductCategoryId, ProductStatusId = activeStatus.ProductStatusId, Price = 150, Cost = 50, StockQuantity = 100 }
        );
        await db.SaveChangesAsync();
    }

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
    var adminRole = await db.Roles.SingleAsync(r => r.Name == "Admin");
    var adminEmail = "abayshemelisshiferaw@gmail.com";
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
            Name = "Admin",
            Email = adminEmail,
            RoleId = adminRole.RoleId,
            PasswordHash = passwordHasher.Hash(adminPassword)
        });
        await db.SaveChangesAsync();
    }

    var adminUser = await db.Identities.SingleAsync(i => i.Email == adminEmail);

    if (!await db.Tags.AnyAsync())
    {
        db.Tags.AddRange(
            new Tag { Name = "VIP" },
            new Tag { Name = "Prospect" },
            new Tag { Name = "Important" }
        );
        await db.SaveChangesAsync();
    }

    if (!await db.Companies.AnyAsync() && !await db.Customers.AnyAsync() && !await db.Leads.AnyAsync())
    {
        var defaultSource = await db.Sources.FirstAsync();
        var defaultLeadStatus = await db.LeadStatuses.SingleAsync(ls => ls.Name == "New");
        var vipTag = await db.Tags.SingleAsync(t => t.Name == "VIP");
        var prospectTag = await db.Tags.SingleAsync(t => t.Name == "Prospect");

        var sampleCompany = new Company
        {
            Name = "Acme Technologies",
            Industry = "Software",
            CompanySize = "51-200",
            Website = "https://acme.example.com",
            Address = "123 Market St, Suite 400",
            Phone = "(555) 123-4567",
            Email = "contact@acme.example.com",
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId
        };
        db.Companies.Add(sampleCompany);

        var company2 = new Company
        {
            Name = "Global Solutions Inc",
            Industry = "Consulting",
            CompanySize = "201-500",
            Website = "https://globalsolutions.example.com",
            Address = "456 Business Ave, Floor 12",
            Phone = "(555) 234-5678",
            Email = "info@globalsolutions.example.com",
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId
        };
        db.Companies.Add(company2);

        var company3 = new Company
        {
            Name = "TechStart Ventures",
            Industry = "Technology",
            CompanySize = "11-50",
            Website = "https://techstart.example.com",
            Address = "789 Innovation Blvd",
            Phone = "(555) 345-6789",
            Email = "hello@techstart.example.com",
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId
        };
        db.Companies.Add(company3);

        await db.SaveChangesAsync();

        var sampleCustomer = new Customer
        {
            FirstName = "Jane",
            LastName = "Anderson",
            Email = "jane.anderson@acme.example.com",
            Phone = "(555) 987-6543",
            JobTitle = "VP of Sales",
            CompanyId = sampleCompany.CompanyId,
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId,
            CreatedAt = DateTime.UtcNow
        };
        sampleCustomer.Tags.Add(vipTag);
        db.Customers.Add(sampleCustomer);

        var customer2 = new Customer
        {
            FirstName = "Michael",
            LastName = "Chen",
            Email = "michael.chen@globalsolutions.example.com",
            Phone = "(555) 876-5432",
            JobTitle = "CTO",
            CompanyId = company2.CompanyId,
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId,
            CreatedAt = DateTime.UtcNow
        };
        customer2.Tags.Add(prospectTag);
        db.Customers.Add(customer2);

        var customer3 = new Customer
        {
            FirstName = "Sarah",
            LastName = "Williams",
            Email = "sarah.williams@techstart.example.com",
            Phone = "(555) 765-4321",
            JobTitle = "CEO",
            CompanyId = company3.CompanyId,
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId,
            CreatedAt = DateTime.UtcNow
        };
        customer3.Tags.Add(vipTag);
        db.Customers.Add(customer3);

        var customer4 = new Customer
        {
            FirstName = "David",
            LastName = "Johnson",
            Email = "david.johnson@acme.example.com",
            Phone = "(555) 654-3210",
            JobTitle = "Engineering Manager",
            CompanyId = sampleCompany.CompanyId,
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId,
            CreatedAt = DateTime.UtcNow
        };
        db.Customers.Add(customer4);

        var customer5 = new Customer
        {
            FirstName = "Emily",
            LastName = "Brown",
            Email = "emily.brown@globalsolutions.example.com",
            Phone = "(555) 543-2109",
            JobTitle = "Marketing Director",
            CompanyId = company2.CompanyId,
            SourceId = defaultSource.SourceId,
            AssignedRepId = adminUser.IdentityId,
            CreatedAt = DateTime.UtcNow
        };
        customer5.Tags.Add(prospectTag);
        db.Customers.Add(customer5);

        db.Leads.Add(new Lead
        {
            FirstName = "Ethan",
            LastName = "Morris",
            Email = "ethan.morris@example.com",
            Phone = "(555) 342-7684",
            JobTitle = "Director of Operations",
            CompanyName = "FutureWorks",
            SourceId = defaultSource.SourceId,
            LeadStatusId = defaultLeadStatus.LeadStatusId,
            AssignedRepId = adminUser.IdentityId,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
    }
}
app.Run();