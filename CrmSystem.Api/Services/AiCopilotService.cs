using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CrmSystem.Api.Dtos;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Services;

public class AiCopilotService : IAiCopilotService
{
    private readonly AppDbContext _db;
    private readonly IGeminiService _geminiService;

    public AiCopilotService(AppDbContext db, IGeminiService geminiService)
    {
        _db = db;
        _geminiService = geminiService;
    }

    public async Task<CopilotChatResponse> ProcessCopilotChatAsync(CopilotChatRequest request, int userId)
    {
        var userMsg = request.Message?.Trim() ?? string.Empty;
        var route = request.Route?.ToLower() ?? "/";
        var suggestedActions = new List<CopilotActionDto>();
        string contextSummary = "Global AI Copilot";

        // 1. Full Project Database Snapshot Gathering
        int totalCustomers = 0, totalLeads = 0, hotLeadsCount = 0, totalCompanies = 0, totalProducts = 0, totalContracts = 0, totalInvoices = 0, totalTasks = 0, totalActivities = 0;
        decimal totalPipelineVal = 0m, totalSignedContractsVal = 0m, totalPaidInvoicesVal = 0m, totalOverdueInvoicesVal = 0m;
        int pendingTasksCount = 0, overdueTasksCount = 0, unpaidInvoicesCount = 0, signedContractsCount = 0;

        List<string> productSummaryList = new();
        List<string> companySummaryList = new();
        List<string> oppStageSummaryList = new();
        List<string> searchMatchesList = new();

        // Safe DB Metrics Extraction
        try { totalCustomers = await _db.Customers.CountAsync(); } catch { }
        try { totalLeads = await _db.Leads.CountAsync(l => !l.IsDeleted); } catch { }
        try { hotLeadsCount = await _db.Leads.CountAsync(l => !l.IsDeleted && l.LeadScore >= 70); } catch { }
        try { totalCompanies = await _db.Companies.CountAsync(); } catch { }
        try { totalProducts = await _db.Products.CountAsync(); } catch { }
        try { totalContracts = await _db.Contracts.CountAsync(c => !c.IsDeleted); } catch { }
        try { totalInvoices = await _db.Invoices.CountAsync(); } catch { }
        try { totalTasks = await _db.CrmTasks.CountAsync(); } catch { }
        try { totalActivities = await _db.Activities.CountAsync(); } catch { }

        try { totalPipelineVal = await _db.Opportunities.SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m; } catch { }
        try { pendingTasksCount = await _db.CrmTasks.CountAsync(); } catch { }
        try { overdueTasksCount = await _db.CrmTasks.CountAsync(t => t.DueDate < DateTime.UtcNow); } catch { }
        try { unpaidInvoicesCount = await _db.Invoices.CountAsync(i => i.Status != "Paid"); } catch { }

        try
        {
            signedContractsCount = await _db.Contracts.CountAsync(c => !c.IsDeleted && (c.Status == "Signed" || c.Status == "Active"));
            totalSignedContractsVal = await _db.Contracts.Where(c => !c.IsDeleted && (c.Status == "Signed" || c.Status == "Active")).SumAsync(c => (decimal?)c.ContractValue) ?? 0m;
        }
        catch { }

        try
        {
            totalPaidInvoicesVal = await _db.Invoices.Where(i => i.Status == "Paid").SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;
            totalOverdueInvoicesVal = await _db.Invoices.Where(i => i.Status == "Overdue").SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;
        }
        catch { }

        // Products Catalog Overview
        try
        {
            var prods = await _db.Products.Take(5).ToListAsync();
            productSummaryList = prods.Select(p => $"{p.Name} (SKU: {p.SKU ?? "N/A"}, Price: {p.Price:C})").ToList();
        }
        catch { }

        // Companies Portfolio Overview
        try
        {
            var comps = await _db.Companies.Take(5).ToListAsync();
            companySummaryList = comps.Select(c => $"{c.Name} (Industry: {c.Industry ?? "General"})").ToList();
        }
        catch { }

        // Opportunity Pipeline Breakdown by Stage
        try
        {
            var opps = await _db.Opportunities.Include(o => o.OpportunityStage).ToListAsync();
            var grouped = opps.GroupBy(o => o.OpportunityStage?.Name ?? "Unassigned");
            foreach (var g in grouped)
            {
                var stageCount = g.Count();
                var stageVal = g.Sum(o => o.EstimatedValue);
                oppStageSummaryList.Add($"{g.Key}: {stageCount} deals (${stageVal:N0})");
            }
        }
        catch { }

        // 2. Dynamic Search Across Database Tables for User Keywords
        if (!string.IsNullOrWhiteSpace(userMsg) && userMsg.Length > 2)
        {
            var terms = userMsg.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(t => t.Length > 2 && !new[] { "what", "show", "tell", "list", "have", "with", "from", "about", "this", "that", "does", "where", "whom", "much", "many", "does", "have", "your", "name", "hello", "hi", "how" }.Contains(t.ToLower()))
                .ToList();

            foreach (var term in terms.Take(3))
            {
                var termLower = term.ToLower();

                // Search Leads
                try
                {
                    var matchingLeads = await _db.Leads
                        .Where(l => !l.IsDeleted && (l.FirstName.ToLower().Contains(termLower) || l.LastName.ToLower().Contains(termLower) || (l.CompanyName != null && l.CompanyName.ToLower().Contains(termLower))))
                        .Take(3).ToListAsync();
                    foreach (var l in matchingLeads)
                    {
                        searchMatchesList.Add($"[Lead] #{l.LeadId} {l.FirstName} {l.LastName} - Company: {l.CompanyName ?? "N/A"}, Score: {l.LeadScore}, Phone: {l.Phone ?? "N/A"}");
                    }
                }
                catch { }

                // Search Customers
                try
                {
                    var matchingCustomers = await _db.Customers
                        .Where(c => c.FirstName.ToLower().Contains(termLower) || c.LastName.ToLower().Contains(termLower) || (c.Email != null && c.Email.ToLower().Contains(termLower)))
                        .Take(3).ToListAsync();
                    foreach (var c in matchingCustomers)
                    {
                        searchMatchesList.Add($"[Customer] #{c.CustomerId} {c.FirstName} {c.LastName} - Email: {c.Email ?? "N/A"}, Phone: {c.Phone ?? "N/A"}");
                    }
                }
                catch { }

                // Search Products
                try
                {
                    var matchingProds = await _db.Products
                        .Where(p => p.Name.ToLower().Contains(termLower) || (p.SKU != null && p.SKU.ToLower().Contains(termLower)))
                        .Take(3).ToListAsync();
                    foreach (var p in matchingProds)
                    {
                        searchMatchesList.Add($"[Product] {p.Name} - Price: {p.Price:C}, SKU: {p.SKU ?? "N/A"}");
                    }
                }
                catch { }

                // Search Companies
                try
                {
                    var matchingComps = await _db.Companies
                        .Where(c => c.Name.ToLower().Contains(termLower))
                        .Take(3).ToListAsync();
                    foreach (var c in matchingComps)
                    {
                        searchMatchesList.Add($"[Company] {c.Name} - Industry: {c.Industry ?? "General"}");
                    }
                }
                catch { }
            }
        }

        // 3. Build Detailed Project-Wide Context Prompt
        var contextSb = new StringBuilder();
        contextSb.AppendLine("=== CRM SYSTEM DATABASE REPOSITORY SNAPSHOT ===");
        contextSb.AppendLine($"Metrics: {totalCustomers} Customers | {totalLeads} Leads ({hotLeadsCount} Hot) | {totalCompanies} Companies | {totalProducts} Products | {totalContracts} Contracts ({signedContractsCount} Signed, ${totalSignedContractsVal:N0}) | {totalInvoices} Invoices (${totalPaidInvoicesVal:N0} Paid, ${totalOverdueInvoicesVal:N0} Overdue) | {totalTasks} Tasks ({overdueTasksCount} Overdue) | {totalActivities} Logged Activities.");
        contextSb.AppendLine($"Sales Pipeline Value: ${totalPipelineVal:N0}");

        if (oppStageSummaryList.Count > 0)
        {
            contextSb.AppendLine("Pipeline Stages: " + string.Join(" | ", oppStageSummaryList));
        }

        if (productSummaryList.Count > 0)
        {
            contextSb.AppendLine("Product Catalog Sample: " + string.Join(" ; ", productSummaryList));
        }

        if (companySummaryList.Count > 0)
        {
            contextSb.AppendLine("Companies Portfolio Sample: " + string.Join(" ; ", companySummaryList));
        }

        if (searchMatchesList.Count > 0)
        {
            contextSb.AppendLine("=== DYNAMIC CRM SEARCH MATCHES FOR USER QUERY ===");
            contextSb.AppendLine(string.Join("\n", searchMatchesList.Distinct()));
        }

        // Action links
        suggestedActions.Add(new CopilotActionDto { Label = "View Products", ActionType = "navigate", TargetUrl = "/products" });
        suggestedActions.Add(new CopilotActionDto { Label = "View Pipeline", ActionType = "navigate", TargetUrl = "/opportunities" });

        // 4. Universal LLM Prompt (Handles BOTH CRM & General Non-CRM Questions)
        if (_geminiService.IsConfigured)
        {
            try
            {
                var historyText = string.Empty;
                if (request.History != null && request.History.Count > 0)
                {
                    var lastHistory = request.History.TakeLast(4);
                    historyText = string.Join("\n", lastHistory.Select(h => $"{h.Role.ToUpper()}: {h.Message}"));
                }

                var universalPrompt = $"""
                    You are an intelligent, friendly, universal AI Assistant and Executive Copilot.

                    YOUR CAPABILITIES:
                    1. GENERAL & WORLD KNOWLEDGE QUESTIONS (Non-CRM): You can answer ANY question about general science, technology, coding, language, math, business advice, history, or general knowledge. If the user asks a question not related to CRM data, answer it directly, accurately, and comprehensively!
                    2. CRM & PROJECT QUESTIONS: If the user asks about CRM records, customers, leads, sales, products, contracts, invoices, or pipeline data, use the real-time CRM database snapshot provided below to give precise numbers and answers.

                    REAL-TIME CRM DATABASE SNAPSHOT (Use when user asks CRM-related questions):
                    {contextSb}

                    CONVERSATION HISTORY:
                    {historyText}

                    USER QUESTION:
                    {userMsg}

                    INSTRUCTIONS:
                    - Be helpful, conversational, and direct.
                    - Use GitHub Markdown (bold headers, bullet points, code blocks if writing code).
                    - If the user asks a general question, answer it fully. Do not force CRM data into a non-CRM question.
                    """;

                var geminiReply = await _geminiService.GenerateTextAsync(universalPrompt, request.Attachment);
                if (!string.IsNullOrWhiteSpace(geminiReply))
                {
                    return new CopilotChatResponse
                    {
                        Reply = geminiReply,
                        SuggestedActions = suggestedActions,
                        IsGeminiPowered = true,
                        CurrentContextSummary = contextSummary
                    };
                }
            }
            catch
            {
                // Fall through cleanly to local intent processor
            }
        }

        // 5. Intelligent Local Intent Processor (Handles CRM + Common General Questions Offline)
        var msgLower = userMsg.ToLower();
        string fallbackReply;

        // DYNAMIC DATABASE KEYWORD SEARCH RESULTS (Priority #1 for database queries)
        if (searchMatchesList.Count > 0)
        {
            fallbackReply = $"**CRM Database Matches for '{userMsg}'**\n\n" + string.Join("\n", searchMatchesList.Select(m => $"- {m}"));
        }
        // GREETINGS / WHO ARE YOU / GENERAL INTRO
        else if (msgLower.Contains("who are you") || msgLower.Contains("what can you do") || msgLower.Contains("hello") || msgLower.Contains("hi ") || msgLower == "hi" || msgLower.Contains("help"))
        {
            fallbackReply = "Hello! I am your **Universal AI Executive Copilot**.\n\nI can answer **both general questions** and **CRM project questions**!\n\n- 🌍 **General Questions:** Ask me anything about programming, technology, business strategies, math, or world knowledge.\n- 📊 **CRM Database:** Ask about your customers, hot leads, products, pipeline revenue, signed contracts, or unpaid invoices!";
        }
        // CUSTOMERS / CLIENTS QUERY
        else if (msgLower.Contains("customer") || msgLower.Contains("client"))
        {
            List<Customer> topCustomers = new();
            try
            {
                topCustomers = await _db.Customers.Include(c => c.Company).Take(4).ToListAsync();
            }
            catch { }

            var cList = topCustomers.Count > 0
                ? "\n\n**Sample Active Customers:**\n" + string.Join("\n", topCustomers.Select(c => $"- **{c.FirstName} {c.LastName}** ({c.Company?.Name ?? "Individual Account"}) · {c.Email ?? "No Email"}"))
                : string.Empty;

            fallbackReply = $"**Customer Accounts Intelligence**\n\nYou currently have **{totalCustomers} active customer profiles** registered in your CRM system.{cList}\n\n*Tip: Navigate to Customers to view complete details, activity logs, and account histories.*";
        }
        // PRODUCTS QUERY
        else if (msgLower.Contains("product") || msgLower.Contains("sku") || msgLower.Contains("item") || msgLower.Contains("catalog") || msgLower.Contains("price") || msgLower.Contains("sell") || msgLower.Contains("offer"))
        {
            var pList = productSummaryList.Count > 0 ? string.Join("\n", productSummaryList.Select(p => $"- **{p}**")) : "No active products registered in catalog.";
            fallbackReply = $"**Product Catalog Overview ({totalProducts} Active Products)**\n\n{pList}\n\n*Tip: Click 'View Products' to manage catalog items and SKUs.*";
        }
        // COMPANIES QUERY
        else if (msgLower.Contains("company") || msgLower.Contains("companies") || msgLower.Contains("corporate") || msgLower.Contains("account"))
        {
            var cList = companySummaryList.Count > 0 ? string.Join("\n", companySummaryList.Select(c => $"- **{c}**")) : "No corporate accounts registered.";
            fallbackReply = $"**Corporate Accounts Overview ({totalCompanies} Linked Companies)**\n\n{cList}\n\n*Tip: Navigate to Companies to view corporate account portfolios.*";
        }
        // CONTRACTS QUERY
        else if (msgLower.Contains("contract") || msgLower.Contains("signed") || msgLower.Contains("esign") || msgLower.Contains("agreement"))
        {
            fallbackReply = $"**Contracts & E-Signatures Overview**\n\n- **Total Contracts:** {totalContracts}\n- **Signed/Active Contracts:** {signedContractsCount} (${totalSignedContractsVal:N0} total value)\n\n*Tip: Share public e-signature links for instant online contract signing.*";
        }
        // INVOICES QUERY
        else if (msgLower.Contains("invoice") || msgLower.Contains("paid") || msgLower.Contains("billing") || msgLower.Contains("stripe") || msgLower.Contains("unpaid") || msgLower.Contains("overdue"))
        {
            fallbackReply = $"**Invoices & Stripe Payment Tallies**\n\n- **Total Invoices:** {totalInvoices}\n- **Paid Revenue:** ${totalPaidInvoicesVal:N0}\n- **Overdue Payments:** ${totalOverdueInvoicesVal:N0} ({unpaidInvoicesCount} unpaid invoices)\n\n*Tip: Clients can complete live credit card checkout via Stripe.*";
        }
        // LEADS QUERY
        else if (msgLower.Contains("hot") || msgLower.Contains("lead") || msgLower.Contains("prospect"))
        {
            List<Lead> topHotLeads = new();
            try
            {
                topHotLeads = await _db.Leads
                    .Where(l => !l.IsDeleted && l.LeadScore >= 70)
                    .OrderByDescending(l => l.LeadScore)
                    .Take(4)
                    .ToListAsync();
            }
            catch { }

            if (topHotLeads.Count > 0)
            {
                var leadList = string.Join("\n", topHotLeads.Select(l => $"- **{l.FirstName} {l.LastName}** ({l.CompanyName ?? "Individual"}) · Score: {l.LeadScore} 🔥"));
                fallbackReply = $"**Top Hot Prospects ({hotLeadsCount} Total Hot Leads out of {totalLeads} Leads)**\n\n{leadList}\n\n*Recommendation: Execute fast outreach to lock in demos.*";
            }
            else
            {
                fallbackReply = $"You currently have **{totalLeads} managed leads** ({hotLeadsCount} classified as Hot with score >= 70).";
            }
        }
        // PIPELINE / REVENUE QUERY
        else if (msgLower.Contains("pipeline") || msgLower.Contains("revenue") || msgLower.Contains("deal") || msgLower.Contains("forecast") || msgLower.Contains("stage"))
        {
            var stgText = oppStageSummaryList.Count > 0 ? string.Join("\n", oppStageSummaryList.Select(s => $"- **{s}**")) : $"Total Pipeline Value: ${totalPipelineVal:N0}";
            fallbackReply = $"**Sales Pipeline & Stage Breakdown**\n\n- **Total Pipeline Value:** ${totalPipelineVal:N0}\n\n**Stage Metrics:**\n{stgText}";
        }
        // TASKS / ACTIVITIES QUERY
        else if (msgLower.Contains("task") || msgLower.Contains("todo") || msgLower.Contains("calendar") || msgLower.Contains("activity") || msgLower.Contains("history"))
        {
            fallbackReply = $"**Operations & Activity Touchpoints**\n\n- **Total Logged Activities:** {totalActivities} (Calls, Emails, Meetings)\n- **Pending Tasks:** {pendingTasksCount}\n- **Overdue Action Items:** {overdueTasksCount}";
        }
        // DYNAMIC QUESTION ADVISOR (Distinct reply for any custom question)
        else
        {
            fallbackReply = $"**AI Advisor Response for: '{userMsg}'**\n\n- 🎯 **Target Workspace:** {contextSummary}\n- 📊 **Current Database Snapshot:** {totalCustomers} Customers | {totalLeads} Leads ({hotLeadsCount} Hot) | {totalProducts} Products | ${totalPipelineVal:N0} Pipeline Value\n- 💡 **Need specific information?** Try asking: *'What products do we sell?'*, *'List hot prospects'*, or search for any name or keyword!";
        }

        return new CopilotChatResponse
        {
            Reply = fallbackReply,
            SuggestedActions = suggestedActions,
            IsGeminiPowered = false,
            CurrentContextSummary = contextSummary
        };
    }

    public async Task<CopilotChatResponse> ProcessPublicVisitorChatAsync(CopilotChatRequest request)
    {
        var msg = request?.Message?.Trim() ?? string.Empty;
        var msgLower = msg.ToLower();

        // Format history text if present
        var historyText = string.Empty;
        if (request?.History != null && request.History.Count > 0)
        {
            var lastHistory = request.History.TakeLast(6);
            historyText = string.Join("\n", lastHistory.Select(h => $"{h.Role.ToUpper()}: {h.Message}"));
        }

        // 1. Try Gemini LLM Product Specialist Prompt
        if (_geminiService.IsConfigured)
        {
            try
            {
                var systemPrompt = $"""
                    You are the Official Public Product AI Specialist & CRM Advisor for this Enterprise SaaS CRM application.
                    You are speaking to a prospective customer or website visitor on the public landing page.

                    CRM PRODUCT CAPABILITIES & SYSTEM ARCHITECTURE:
                    1. Customer & Company Management: 360-degree account records, B2B corporate structures, multiple contact links per company, custom tags.
                    2. Lead Acquisition & Conversion: Multi-channel lead tracking, Hot/Warm/Cold AI lead scoring (0-100), SLA response tracking, 1-click lead conversion into Customer, Company, and Opportunity.
                    3. Opportunity Pipeline Kanban: Visual drag-and-drop deal board, customizable stage probabilities, win/loss forecasting.
                    4. Digital Contracts & E-Signatures: Contract creation, shareable public e-signature link tokens, online digital signature capture, auto PDF exports.
                    5. Invoices & Stripe Payments: Issue invoices, process instant credit card payments via Stripe integration, automated payment status updates to Paid.
                    6. Product Catalog: SKU management, stock tracking, custom line-item quotes attached to deal proposals.
                    7. Task Calendar & Activity Logs: Priorities, overdue alerts, phone calls, email, and meeting touchpoints.
                    8. Custom Fields Engine: Extend Leads, Customers, and Opportunities with text, date, dropdown, or number fields.
                    9. Field-Level Audit Trail: Complete governance tracking every field edit with old/new values, user ID, and timestamp.
                    10. Security & Governance: Role-based permissions (Admin, Manager, SalesRep).

                    CONVERSATION HISTORY:
                    {(string.IsNullOrWhiteSpace(historyText) ? "None" : historyText)}

                    CURRENT VISITOR QUESTION:
                    {msg}

                    INSTRUCTIONS:
                    - If the visitor asks a CRM product question: Answer concisely, warmly, and persuasively using GitHub Markdown.
                    - If the visitor asks a GENERAL non-CRM question: Answer it directly and helpfully!
                    - Keep answers within 2-3 structured bullet points or short paragraphs.
                    """;

                var reply = await _geminiService.GenerateTextAsync(systemPrompt, request.Attachment);
                if (!string.IsNullOrWhiteSpace(reply))
                {
                    return new CopilotChatResponse
                    {
                        Reply = reply,
                        IsGeminiPowered = true,
                        CurrentContextSummary = "Public Product AI Assistant"
                    };
                }
            }
            catch { }
        }

        // 2. Fallback Product Knowledge Engine
        string fallbackReply;

        if (msgLower.Contains("stripe") || msgLower.Contains("payment") || msgLower.Contains("invoice") || msgLower.Contains("credit card"))
        {
            fallbackReply = "**Invoicing & Stripe Payment Gateway**\n\n- **Live Online Checkout:** Clients can pay invoices directly online using credit cards via Stripe.\n- **Auto-Sync:** Invoice statuses update automatically to **Paid** upon successful transaction.\n- **Receipts:** Client payment receipts are generated and stored automatically in the system.";
        }
        else if (msgLower.Contains("contract") || msgLower.Contains("esign") || msgLower.Contains("signature") || msgLower.Contains("pdf"))
        {
            fallbackReply = "**Digital Contracts & Public E-Signatures**\n\n- **E-Signing Portal:** Generate contracts and share secure public signing links with clients.\n- **Digital Signature:** Clients sign online directly from their phone or desktop browser.\n- **PDF Exports:** Signed agreements automatically export to PDF with instant invoice generation.";
        }
        else if (msgLower.Contains("lead") || msgLower.Contains("score") || msgLower.Contains("convert") || msgLower.Contains("ai"))
        {
            fallbackReply = "**AI Lead Scoring & Fast Conversion**\n\n- **Predictive Scoring:** Prospects receive a 0–100 Hot/Warm/Cold rating based on domain quality and engagement.\n- **SLA Breach Alerts:** Tracks uncontacted leads and notifies sales reps before leads go cold.\n- **1-Click Conversion:** Active leads convert directly into linked Customer, Company, and Deal records with full history preservation.";
        }
        else if (msgLower.Contains("custom field") || msgLower.Contains("customize") || msgLower.Contains("extend"))
        {
            fallbackReply = "**Custom Fields & Audit Trail Engine**\n\n- **Flexible Entity Schema:** Define custom text, number, date, or dropdown fields for Leads, Customers, and Deals.\n- **Deep Governance:** Field-level audit trail logs every single modification with old and new values.";
        }
        else if (msgLower.Contains("pricing") || msgLower.Contains("cost") || msgLower.Contains("sign up") || msgLower.Contains("demo") || msgLower.Contains("start"))
        {
            fallbackReply = "**Get Started & Demo Access**\n\n- Click the **'Get Started'** button at the top right of the landing page to log into the demo portal.\n- You can also submit the Contact Form below to request an enterprise walkthrough!";
        }
        else
        {
            fallbackReply = $"**CRM Product Advisor Response for: '{msg}'**\n\nOur CRM platform includes:\n- 🎯 **Lead Intelligence & AI Scoring**\n- 📈 **Opportunity Pipeline Kanban Board**\n- ✍️ **Digital Contracts & E-Signatures**\n- 💳 **Invoices & Stripe Payment Checkout**\n- ⚙️ **Custom Fields & Complete Audit Logs**\n- 📅 **Task Scheduling & Activity Timelines**\n\n*Click 'Get Started' to test the application live!*";
        }

        return new CopilotChatResponse
        {
            Reply = fallbackReply,
            IsGeminiPowered = false,
            CurrentContextSummary = "Public Product AI Assistant"
        };
    }
}
