# AGENTS.md

This repository contains a CRM application split between a .NET 10 backend and a React + TypeScript frontend.

## Architecture at a glance
- Backend entrypoint: [CrmSystem.Api/Program.cs](CrmSystem.Api/Program.cs)
- Database context and EF Core model: [CrmSystem.Infrastructure/AppDbContext.cs](CrmSystem.Infrastructure/AppDbContext.cs)
- Domain entities and enums: [CrmSystem.Domain/Entities](CrmSystem.Domain/Entities)
- Frontend app shell and routes: [CrmSystem.Client/src/App.tsx](CrmSystem.Client/src/App.tsx)
- Database reference schema: [crm_schema.sql](crm_schema.sql)

## Common commands
- Backend build: `dotnet build CrmSystem.sln`
- Backend tests: `dotnet test CrmSystem.Tests/CrmSystem.Tests.csproj`
- Backend run: `dotnet run --project CrmSystem.Api`
- Frontend install: `cd CrmSystem.Client && npm install`
- Frontend build: `cd CrmSystem.Client && npm run build`
- Frontend dev server: `cd CrmSystem.Client && npm run dev`

## Project conventions
- Keep API controllers thin and use DTOs from [CrmSystem.Api/Dtos](CrmSystem.Api/Dtos) for request and response shapes.
- Put reusable business logic in [CrmSystem.Api/Services](CrmSystem.Api/Services) rather than embedding it directly in controllers.
- Keep EF Core mapping and relationships in [CrmSystem.Infrastructure/AppDbContext.cs](CrmSystem.Infrastructure/AppDbContext.cs); if the schema changes, update migrations under [CrmSystem.Infrastructure/Migrations](CrmSystem.Infrastructure/Migrations).
- Preserve the existing auth pattern: the frontend uses [CrmSystem.Client/src/context](CrmSystem.Client/src/context) and protected routes in [CrmSystem.Client/src/App.tsx](CrmSystem.Client/src/App.tsx).
- For UI work, prefer existing patterns in [CrmSystem.Client/src/screens](CrmSystem.Client/src/screens) and [CrmSystem.Client/src/components](CrmSystem.Client/src/components).

## Environment notes
- The backend targets .NET 10 and expects a SQL Server connection string configured for the API project.
- The frontend runs through Vite and is typically accessed at http://localhost:5173.
- The API seeds a default admin account on startup with the email abayshemelisshiferaw@gmail.com and password admin123.

## Change guidance
- Prefer small, focused changes that stay within the existing architecture.
- Keep the API and frontend in sync when adding or changing features.
- Avoid unrelated editor or IDE configuration churn unless the user explicitly asks for it.
