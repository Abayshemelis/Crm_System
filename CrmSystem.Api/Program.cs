// ==============================================================================
// CRM SYSTEM BACKEND ENTRYPOINT (Program.cs)
// ==============================================================================
// This file configures the entire ASP.NET Core web application, including:
// 1. Dependency Injection (DI) Service Registration (Database, Services, APIs)
// 2. Security Middleware (JWT Authentication, RBAC Authorization, CORS, Rate Limiting)
// 3. Real-time Communication (SignalR Notification Hub)
// 4. Static File Hosting (Document attachments, uploaded PDFs)
// 5. Database Auto-Migration & Baseline Seed Data Initialization
// ==============================================================================

using System.Text;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using CrmSystem.Api.Hubs;
using CrmSystem.Api.Middleware;
using CrmSystem.Domain.Entities;
using IAuditService = CrmSystem.Infrastructure.Services.IAuditService;

var builder = WebApplication.CreateBuilder(args);

// ── 1. CONTROLLERS & JSON SERIALIZATION ────────────────────────────────────────
// Configures ASP.NET Core controllers with CamelCase JSON naming conventions
// so C# PascalCase properties serialize to JavaScript standard camelCase.
var mvcBuilder = builder.Services.AddControllers();
mvcBuilder.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

if (builder.Environment.IsEnvironment("Test"))
{
    // Use Newtonsoft for tests to avoid TestServer PipeWriter edge cases with System.Text.Json
    mvcBuilder.AddNewtonsoftJson();
}

builder.Services.AddOpenApi();
builder.Services.AddSignalR(); // Registers SignalR for real-time WebSocket notifications

// ── 2. CROSS-ORIGIN RESOURCE SHARING (CORS) ───────────────────────────────────
// Allows our React frontend (running on Vite http://localhost:5173) to communicate
// with this backend API securely, including credentials and headers.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ── 3. DATABASE CONFIGURATION (EF CORE) ───────────────────────────────────────
// Connects to Microsoft SQL Server, with automatic fallback to InMemory database
// for local unit tests or lightweight development.
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

// ── 4. DEPENDENCY INJECTION (SERVICE REGISTRATIONS) ───────────────────────────
// Registers application services into the IoC (Inversion of Control) container.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();                 // Extracts current user ID & role from ClaimsPrincipal
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();                   // Secure BCrypt password hashing & verification
builder.Services.AddScoped<ITokenService, JwtTokenService>();                           // JWT Access & Refresh token generation
builder.Services.AddHttpClient<IGoogleAuthService, GoogleAuthService>();               // Google OAuth token validation HTTP client
builder.Services.AddHttpClient<IGeminiService, GeminiService>();                       // AI / LLM integration service
builder.Services.AddScoped<IOpportunityService, OpportunityService>();                 // Sales pipeline & opportunity lifecycle
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();                           // Outbound SMTP email dispatch
builder.Services.AddScoped<IEmailTemplateService, EmailTemplateService>();             // Email templating & variable substitution
builder.Services.AddScoped<IEmailTriggerService, EmailTriggerService>();               // Event-based email triggers
builder.Services.AddScoped<IAuditService, AuditService>();                             // Audit trail logging
builder.Services.AddScoped<IActivityService, ActivityService>();                       // Activity & timeline logging
builder.Services.AddScoped<ITaskService, TaskService>();                               // Task management
builder.Services.AddScoped<INotificationService, NotificationService>();               // Notification generation engine
builder.Services.AddScoped<INotificationHubContext, NotificationHubContextAdapter>(); // Adapter bridging Infrastructure to SignalR Hub
builder.Services.AddScoped<ILeadScoringService, LeadScoringService>();                 // AI / Rule-based lead scoring
builder.Services.AddScoped<IImportService, ImportService>();                           // CSV/Excel lead/customer import
builder.Services.AddScoped<IAiInsightService, AiInsightService>();                     // AI sales insights
builder.Services.AddScoped<IAiCopilotService, AiCopilotService>();                     // AI CRM copilot assistant
builder.Services.AddScoped<IStripePaymentService, StripePaymentService>();             // Stripe payment processing
builder.Services.AddHostedService<NotificationBackgroundService>();                   // Periodic background timer generating overdue/due-today alerts
builder.Services.Configure<HostOptions>(options => options.ShutdownTimeout = TimeSpan.FromSeconds(3));

// Standardize Model Validation error responses to HTTP 422 Unprocessable Entity
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

// ── 5. JWT AUTHENTICATION & WEBSOCKET HANDSHAKE ───────────────────────────────
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
        options.Events = new JwtBearerEvents
        {
            // WebSockets do not support custom HTTP headers in browser JavaScript.
            // When connecting to SignalR, the client passes the token as `?access_token=...` in the query string.
            // We extract it here so SignalR can authenticate the connection.
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// ── 6. ROLE-BASED ACCESS CONTROL (RBAC) POLICIES ──────────────────────────────
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

// Apply any pending Entity Framework database migrations on startup
if (!useInMemoryDatabase)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not apply database migrations on startup. Ensure SQL Server or LocalDB is running if UseInMemoryDatabase is false.");
    }
}

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

// ── 7. STATIC FILE SERVING WITH EMBED & CORS HEADERS ──────────────────────────
// Enables serving contract PDFs, uploaded attachments, and user media.
app.UseStaticFiles(new Microsoft.AspNetCore.Builder.StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var headers = ctx.Context.Response.Headers;

        // Remove X-Frame-Options to allow embedding in preview modals
        if (headers.ContainsKey("X-Frame-Options"))
            headers.Remove("X-Frame-Options");

        // Set Content-Disposition inline for browser PDF rendering
        var contentType = ctx.Context.Response.ContentType ?? string.Empty;
        if (contentType.StartsWith("application/pdf", StringComparison.OrdinalIgnoreCase))
        {
            if (!headers.ContainsKey("Content-Disposition"))
            {
                var fileName = System.IO.Path.GetFileName(ctx.File.PhysicalPath) ?? "file.pdf";
                headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            }
        }

        // Echo origin for CORS static file fetching
        if (!headers.ContainsKey("Access-Control-Allow-Origin"))
        {
            var requestOrigin = ctx.Context.Request.Headers["Origin"].ToString();
            headers["Access-Control-Allow-Origin"] = string.IsNullOrEmpty(requestOrigin)
                ? "http://localhost:5173"
                : requestOrigin;
        }
    }
});

app.UseMiddleware<IpRateLimitingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications"); // Map SignalR WebSocket route

// ── 8. BASELINE DATABASE SEEDING ──────────────────────────────────────────────
// Automatically seeds necessary lookup values (Roles, Lead Statuses, Pipeline Stages,
// Activity Types, Products, and Default Administrator) if the database is fresh.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

    // ── Seed Roles ────────────────────────────────────────────────────────
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

    // ── Seed Lead Sources ─────────────────────────────────────────────────
    var sourceSeeds = new[] { "Referral", "Website", "Cold Call", "Social Media", "Trade Show", "Advertisement", "Email Campaign", "Partner", "Other" };
    foreach (var s in sourceSeeds)
    {
        if (!await db.Sources.AnyAsync(x => x.Name == s))
            db.Sources.Add(new Source { Name = s, IsActive = true });
    }
    await db.SaveChangesAsync();

    // ── Seed Lead Statuses ────────────────────────────────────────────────
    var leadStatusSeeds = new (string Name, int Order, bool Terminal)[] {
        ("New", 1, false), ("Contacted", 2, false), ("Qualified", 3, false),
        ("Proposal Sent", 4, false), ("Negotiation", 5, false), ("Follow-up Scheduled", 6, false),
        ("Converted", 7, true), ("Lost", 8, true), ("Closed", 9, true)
    };

    foreach (var (name, order, terminal) in leadStatusSeeds)
    {
        if (!await db.LeadStatuses.AnyAsync(x => x.Name == name))
            db.LeadStatuses.Add(new LeadStatus { Name = name, SortOrder = order, IsTerminal = terminal });
    }
    await db.SaveChangesAsync();

    // ── Seed Opportunity Stages ───────────────────────────────────────────
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

    // ── Seed Activity Types ───────────────────────────────────────────────
    var activityTypeSeeds = new[] { ("Call", "phone"), ("Email", "mail"), ("Meeting", "users"), ("Note", "file-text"), ("Demo", "monitor"), ("Follow-Up", "repeat") };
    foreach (var (name, icon) in activityTypeSeeds)
    {
        if (!await db.ActivityTypes.AnyAsync(x => x.Name == name))
            db.ActivityTypes.Add(new ActivityType { Name = name, Icon = icon });
    }
    await db.SaveChangesAsync();

    // ── Seed CRM Task Statuses ────────────────────────────────────────────
    var taskStatusSeeds = new (string Name, bool Terminal)[] {
        ("Pending", false), ("In Progress", false), ("Completed", true), ("Cancelled", true)
    };
    foreach (var (name, terminal) in taskStatusSeeds)
    {
        if (!await db.CrmTaskStatuses.AnyAsync(x => x.Name == name))
            db.CrmTaskStatuses.Add(new CrmTaskStatus { Name = name, IsTerminal = terminal });
    }
    await db.SaveChangesAsync();

    // ── Seed Notification Types ───────────────────────────────────────────
    var notifTypeSeeds = new[] { ("TaskDue", "InApp"), ("TaskOverdue", "InApp"), ("TaskAssigned", "InApp"), ("OpportunityWon", "InApp"), ("OpportunityLost", "InApp"), ("OpportunityStalled", "InApp"), ("LeadAssigned", "InApp"), ("MentionedInNote", "InApp"), ("FollowUpOverdue", "InApp"), ("SystemAlert", "InApp") };
    foreach (var (name, channel) in notifTypeSeeds)
    {
        if (!await db.NotificationTypes.AnyAsync(x => x.Name == name))
            db.NotificationTypes.Add(new NotificationType { Name = name, DefaultChannel = channel });
    }
    await db.SaveChangesAsync();

    // ── Seed Product Catalog ──────────────────────────────────────────────
    var prodCatSeeds = new[] { "Software", "Hardware", "Services", "Consulting", "Subscription", "Support", "Other" };
    foreach (var s in prodCatSeeds)
    {
        if (!await db.ProductCategories.AnyAsync(x => x.Name == s))
            db.ProductCategories.Add(new ProductCategory { Name = s });
    }
    await db.SaveChangesAsync();

    var prodStatusSeeds = new (string Name, bool Selectable)[] {
        ("Active", true), ("Inactive", false), ("Discontinued", false)
    };
    foreach (var (name, sel) in prodStatusSeeds)
    {
        if (!await db.ProductStatuses.AnyAsync(x => x.Name == name))
            db.ProductStatuses.Add(new ProductStatus { Name = name, IsSelectable = sel });
    }
    await db.SaveChangesAsync();

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

    // ── Seed Entity Types for Audit & Polymorphic Relations ───────────────
    var entityTypeSeeds = new[] { ("Customer", "Customers"), ("Company", "Companies"), ("Lead", "Leads"), ("Opportunity", "Opportunities"), ("Product", "Products"), ("Activity", "Activities"), ("CrmTask", "CrmTasks") };
    foreach (var (name, table) in entityTypeSeeds)
    {
        if (!await db.EntityTypes.AnyAsync(x => x.Name == name))
            db.EntityTypes.Add(new EntityType { Name = name, TableName = table });
    }
    await db.SaveChangesAsync();

    // ── Seed Audit Action Types ───────────────────────────────────────────
    var auditActionSeeds = new[] { "Create", "Update", "Delete", "StatusChange", "StageChange", "Assign", "Convert" };
    foreach (var s in auditActionSeeds)
    {
        if (!await db.AuditActionTypes.AnyAsync(x => x.Name == s))
            db.AuditActionTypes.Add(new AuditActionType { Name = s });
    }
    await db.SaveChangesAsync();

    // ── Seed Default Administrator Account ────────────────────────────────
    var adminRole = await db.Roles.SingleAsync(r => r.Name == "Admin");
    var adminEmail = "abayshemelisshiferaw@gmail.com";
    var adminPassword = "admin123";

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

    var adminIdentityRoleExists = await db.IdentityRoles.AnyAsync(ir => ir.IdentityId == adminUser.IdentityId && ir.RoleId == adminRole.RoleId);
    if (!adminIdentityRoleExists)
    {
        db.IdentityRoles.Add(new IdentityRole { IdentityId = adminUser.IdentityId, RoleId = adminRole.RoleId });
        await db.SaveChangesAsync();
    }

    if (!await db.Tags.AnyAsync())
    {
        db.Tags.AddRange(
            new Tag { Name = "VIP" },
            new Tag { Name = "Prospect" },
            new Tag { Name = "Important" }
        );
        await db.SaveChangesAsync();
    }
}

app.Run();