using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
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

        // 1. Database Metrics & Snapshot Extraction
        int totalCustomers = 0, totalLeads = 0, hotLeadsCount = 0, totalCompanies = 0, totalProducts = 0, totalContracts = 0, totalInvoices = 0, totalTasks = 0, totalActivities = 0;
        decimal totalPipelineVal = 0m, totalSignedContractsVal = 0m, totalPaidInvoicesVal = 0m, totalOverdueInvoicesVal = 0m;
        int pendingTasksCount = 0, overdueTasksCount = 0, unpaidInvoicesCount = 0, signedContractsCount = 0;

        List<string> productSummaryList = new();
        List<string> companySummaryList = new();
        List<string> oppStageSummaryList = new();
        List<string> searchMatchesList = new();

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

        try
        {
            var prods = await _db.Products.Take(6).ToListAsync();
            productSummaryList = prods.Select(p => $"{p.Name} (SKU: {p.SKU ?? "N/A"}, Price: {p.Price:C})").ToList();
        }
        catch { }

        try
        {
            var comps = await _db.Companies.Take(6).ToListAsync();
            companySummaryList = comps.Select(c => $"{c.Name} ({c.Industry ?? "General"})").ToList();
        }
        catch { }

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

        // Dynamic Entity Keyword Search
        if (!string.IsNullOrWhiteSpace(userMsg) && userMsg.Length > 2)
        {
            var terms = userMsg.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(t => t.Length > 2 && !new[] { "what", "show", "tell", "list", "have", "with", "from", "about", "this", "that", "does", "where", "whom", "much", "many", "your", "name", "hello", "hi", "how", "good", "morning", "afternoon", "evening", "thanks", "thank" }.Contains(t.ToLower()))
                .ToList();

            foreach (var term in terms.Take(3))
            {
                var termLower = term.ToLower();

                try
                {
                    var matchingLeads = await _db.Leads
                        .Include(l => l.LeadStatus)
                        .Where(l => !l.IsDeleted && (l.FirstName.ToLower().Contains(termLower) || l.LastName.ToLower().Contains(termLower) || (l.CompanyName != null && l.CompanyName.ToLower().Contains(termLower))))
                        .Take(3).ToListAsync();
                    foreach (var l in matchingLeads)
                    {
                        searchMatchesList.Add($"[Lead] #{l.LeadId} {l.FirstName} {l.LastName} - Company: {l.CompanyName ?? "N/A"}, Score: {l.LeadScore}, Status: {l.LeadStatus?.Name ?? "Active"}");
                    }
                }
                catch { }

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

        // Build Real-Time CRM Knowledge Base
        var contextSb = new StringBuilder();
        contextSb.AppendLine("=== LIVE CRM DATABASE SUMMARY ===");
        contextSb.AppendLine($"- Customers: {totalCustomers} registered accounts");
        contextSb.AppendLine($"- Leads: {totalLeads} total prospects ({hotLeadsCount} Hot leads with score >= 70)");
        contextSb.AppendLine($"- Companies: {totalCompanies} linked corporate accounts");
        contextSb.AppendLine($"- Products: {totalProducts} items in catalog");
        contextSb.AppendLine($"- Pipeline Value: ${totalPipelineVal:N0} total across stages");
        if (oppStageSummaryList.Count > 0)
        {
            contextSb.AppendLine($"- Stage Breakdown: {string.Join(" | ", oppStageSummaryList)}");
        }
        contextSb.AppendLine($"- Contracts: {totalContracts} total ({signedContractsCount} Signed, ${totalSignedContractsVal:N0} signed value)");
        contextSb.AppendLine($"- Invoices: {totalInvoices} total (${totalPaidInvoicesVal:N0} Paid, ${totalOverdueInvoicesVal:N0} Overdue, {unpaidInvoicesCount} unpaid)");
        contextSb.AppendLine($"- Tasks & Activities: {totalTasks} tasks ({overdueTasksCount} overdue), {totalActivities} touchpoint activities logged.");

        if (productSummaryList.Count > 0)
        {
            contextSb.AppendLine("- Catalog Sample: " + string.Join(" ; ", productSummaryList));
        }

        if (companySummaryList.Count > 0)
        {
            contextSb.AppendLine("- Companies Sample: " + string.Join(" ; ", companySummaryList));
        }

        if (searchMatchesList.Count > 0)
        {
            contextSb.AppendLine("=== RELEVANT DATABASE MATCHES ===");
            contextSb.AppendLine(string.Join("\n", searchMatchesList.Distinct()));
        }

        // Context-driven suggested quick actions
        if (userMsg.Contains("lead", StringComparison.OrdinalIgnoreCase) || userMsg.Contains("prospect", StringComparison.OrdinalIgnoreCase))
        {
            suggestedActions.Add(new CopilotActionDto { Label = "View Leads", ActionType = "navigate", TargetUrl = "/leads" });
        }
        else if (userMsg.Contains("pipeline", StringComparison.OrdinalIgnoreCase) || userMsg.Contains("deal", StringComparison.OrdinalIgnoreCase) || userMsg.Contains("stage", StringComparison.OrdinalIgnoreCase))
        {
            suggestedActions.Add(new CopilotActionDto { Label = "Open Pipeline", ActionType = "navigate", TargetUrl = "/pipeline" });
        }
        else if (userMsg.Contains("invoice", StringComparison.OrdinalIgnoreCase) || userMsg.Contains("payment", StringComparison.OrdinalIgnoreCase))
        {
            suggestedActions.Add(new CopilotActionDto { Label = "View Invoices", ActionType = "navigate", TargetUrl = "/invoices" });
        }
        else if (userMsg.Contains("contract", StringComparison.OrdinalIgnoreCase))
        {
            suggestedActions.Add(new CopilotActionDto { Label = "View Contracts", ActionType = "navigate", TargetUrl = "/contracts" });
        }
        else
        {
            suggestedActions.Add(new CopilotActionDto { Label = "Dashboard", ActionType = "navigate", TargetUrl = "/dashboard" });
            suggestedActions.Add(new CopilotActionDto { Label = "Pipeline", ActionType = "navigate", TargetUrl = "/pipeline" });
        }

        // 2. Online Intelligence Engine (Google Gemini with Dynamic Intent Prompting)
        if (_geminiService.IsConfigured)
        {
            try
            {
                var historyText = string.Empty;
                if (request.History != null && request.History.Count > 0)
                {
                    var lastHistory = request.History.TakeLast(6);
                    historyText = string.Join("\n", lastHistory.Select(h => $"{h.Role.ToUpper()}: {h.Message}"));
                }

                var dynamicPrompt = $"""
                    You are an intelligent, natural, context-aware AI Executive Copilot for this enterprise CRM application.

                    CORE BEHAVIOR RULES (CRITICAL):
                    1. GREETINGS & PLEASANTRIES:
                       - If the user simply says "Hello", "Hi", "Good morning", "Hey", "How are you?", etc., respond with a warm, natural, CONCISE greeting in 1-2 sentences.
                       - NEVER dump a long feature list or database manifesto in response to a simple greeting.
                       - Example: "Hello! How can I help you today with your CRM data, sales pipeline, or any other questions?"

                    2. APPRECIATIONS & FAREWELLS:
                       - If the user says "Thank you", "Thanks", "Goodbye", "Bye", respond warmly and concisely.

                    3. CRM QUESTIONS (Customers, Leads, Deals, Revenue, Products, Invoices, Contracts, Tasks):
                       - Answer accurately and directly using the real-time CRM database facts provided below.
                       - Quote exact numbers, names, and stage values when relevant.

                    4. GENERAL QUESTIONS (Coding, Math, Science, Business Strategy, General Knowledge, Writing):
                       - Answer thoroughly, accurately, and naturally.
                       - Do NOT force CRM facts into a non-CRM question.

                    5. HYBRID QUESTIONS (CRM + General Strategy, e.g. "How can I improve my pipeline conversion?"):
                       - Combine proven business strategies with current CRM numbers from this system.

                    6. CONVERSATION CONTEXT & FOLLOW-UPS:
                       - Use the conversation history to understand follow-up questions (e.g. "What about them?", "How much is that in total?").

                    7. AMBIGUOUS QUESTIONS:
                       - If a query is unclear or single-word (e.g. "Status?"), ask a polite clarifying question offering options.

                    LIVE CRM DATABASE FACTS:
                    {contextSb}

                    CONVERSATION HISTORY:
                    {(string.IsNullOrWhiteSpace(historyText) ? "None" : historyText)}

                    CURRENT USER MESSAGE:
                    {userMsg}
                    """;

                var geminiReply = await _geminiService.GenerateTextAsync(dynamicPrompt, request.Attachment);
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
                // Fall through cleanly to local intent engine
            }
        }

        // 3. Built-in Local Intelligence Engine (Offline Context-Aware Reasoning)
        var msgLower = userMsg.ToLower().Trim();
        string fallbackReply;

        // Intent A: Simple Greetings (Short, natural, conversational)
        if (IsSimpleGreeting(msgLower))
        {
            var greetings = new[]
            {
                "Hello! How can I help you today? Feel free to ask about your CRM data, sales pipeline, or any general questions.",
                "Hi there! What can I assist you with today?",
                "Hello! How are things going? Let me know if you need any insights on your leads, deals, or customer accounts.",
                "Good day! How can I help you in your workspace today?"
            };
            var randIndex = Math.Abs(userMsg.GetHashCode()) % greetings.Length;
            fallbackReply = greetings[randIndex];
        }
        // Intent B: Pleasantries & Appreciation
        else if (msgLower == "how are you" || msgLower == "how are you?" || msgLower == "how are you doing" || msgLower == "how are you doing?")
        {
            fallbackReply = "I'm doing great, thank you for asking! Ready to help you with your CRM records, pipeline analytics, or any other questions. What's on your mind?";
        }
        else if (msgLower.StartsWith("thank") || msgLower == "thanks" || msgLower == "thx" || msgLower == "great thanks")
        {
            fallbackReply = "You're very welcome! Let me know whenever you need more help or insights.";
        }
        else if (msgLower == "bye" || msgLower == "goodbye" || msgLower == "see you" || msgLower.StartsWith("see you later"))
        {
            fallbackReply = "Goodbye! Have a productive day ahead, and feel free to reach out whenever you need assistance.";
        }
        // Intent C: Capabilities / Help Question
        else if (msgLower.Contains("who are you") || msgLower == "what can you do" || msgLower == "what can you do?" || msgLower == "help" || msgLower == "help me")
        {
            fallbackReply = "I am your **AI Executive Copilot** for this CRM platform.\n\nHere is how I can help:\n- 📊 **CRM Analytics:** Query real-time metrics on customers, hot leads, pipeline stages, and revenue.\n- 💳 **Sales & Invoicing:** Check signed contracts, unpaid invoices, and Stripe payments.\n- 🔍 **Search & Lookup:** Find specific customers, companies, leads, or products.\n- 💡 **General Knowledge & Strategy:** Ask about sales strategies, email drafts, coding, or general questions.\n\nWhat would you like to explore?";
        }
        // Intent D: Ambiguous Queries (Prompt for clarification)
        else if (msgLower == "status" || msgLower == "status?" || msgLower == "what is the status" || msgLower == "what is the status?")
        {
            fallbackReply = "Could you please specify which status you would like to check?\n\n- 🎯 **Lead Pipeline Status** (New, Contacted, Qualified)\n- 📈 **Opportunity Deal Stages** (Discovery, Proposal, Won/Lost)\n- 💳 **Invoice Status** (Paid, Overdue, Pending)\n- 📝 **Contract Status** (Draft, Sent, Signed)";
        }
        // Intent E: Exact Keyword Database Matches Found
        else if (searchMatchesList.Count > 0 && !msgLower.Contains("how") && !msgLower.Contains("why"))
        {
            fallbackReply = $"**Here are the records matching '{userMsg}':**\n\n" + string.Join("\n", searchMatchesList.Select(m => $"- {m}")) + "\n\n*Click on the relevant section in the navigation to view the complete details.*";
        }
        // Intent F: Customer Accounts Questions
        else if (msgLower.Contains("customer") || msgLower.Contains("client") || msgLower.Contains("buyer"))
        {
            List<Customer> topCustomers = new();
            try { topCustomers = await _db.Customers.Include(c => c.Company).Take(4).ToListAsync(); } catch { }

            var cList = topCustomers.Count > 0
                ? "\n\n**Recent Accounts:**\n" + string.Join("\n", topCustomers.Select(c => $"- **{c.FirstName} {c.LastName}** ({c.Company?.Name ?? "Individual"}) · {c.Email ?? "No Email"}"))
                : string.Empty;

            fallbackReply = $"You currently have **{totalCustomers} registered customer accounts** in the system.{cList}\n\n*Would you like to search for a specific customer name or view account histories?*";
        }
        // Intent G: Leads & Hot Prospects Questions
        else if (msgLower.Contains("lead") || msgLower.Contains("prospect") || msgLower.Contains("hot"))
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
                var leadList = string.Join("\n", topHotLeads.Select(l => $"- **{l.FirstName} {l.LastName}** ({l.CompanyName ?? "Individual"}) · Score: **{l.LeadScore}** 🔥"));
                fallbackReply = $"You currently have **{totalLeads} total leads**, including **{hotLeadsCount} Hot Leads** (score ≥ 70):\n\n{leadList}\n\n*Tip: Prioritize fast follow-ups on high-scoring prospects to boost conversion rates.*";
            }
            else
            {
                fallbackReply = $"You currently have **{totalLeads} total leads** ({hotLeadsCount} classified as Hot with score ≥ 70). No urgent hot leads currently flagged.";
            }
        }
        // Intent H: Sales Pipeline & Deal Revenue Questions
        else if (msgLower.Contains("pipeline") || msgLower.Contains("deal") || msgLower.Contains("revenue") || msgLower.Contains("forecast") || msgLower.Contains("stage"))
        {
            var stgText = oppStageSummaryList.Count > 0 ? string.Join("\n", oppStageSummaryList.Select(s => $"- {s}")) : "No active pipeline deals recorded.";
            fallbackReply = $"**Opportunity Pipeline Breakdown**\n\n- **Total Pipeline Revenue:** **${totalPipelineVal:N0}**\n\n**Deals by Stage:**\n{stgText}\n\n*Tip: View the interactive Pipeline Kanban board to move deals across stages.*";
        }
        // Intent I: Products & Pricing Catalog Questions
        else if (msgLower.Contains("product") || msgLower.Contains("sku") || msgLower.Contains("price") || msgLower.Contains("pricing") || msgLower.Contains("catalog") || msgLower.Contains("inventory"))
        {
            var pList = productSummaryList.Count > 0 ? string.Join("\n", productSummaryList.Select(p => $"- **{p}**")) : "No active products registered.";
            fallbackReply = $"**Product Catalog ({totalProducts} Items)**\n\n{pList}\n\n*Tip: You can attach product line items directly to opportunity proposals and quotes.*";
        }
        // Intent J: Invoices & Payment Questions
        else if (msgLower.Contains("invoice") || msgLower.Contains("billing") || msgLower.Contains("stripe") || msgLower.Contains("paid") || msgLower.Contains("unpaid") || msgLower.Contains("overdue"))
        {
            fallbackReply = $"**Invoicing & Financial Summary**\n\n- **Total Invoices:** {totalInvoices}\n- **Collected Revenue (Paid):** **${totalPaidInvoicesVal:N0}**\n- **Overdue Invoices:** **${totalOverdueInvoicesVal:N0}** ({unpaidInvoicesCount} invoices pending payment)\n\n*Clients can pay directly online using the integrated Stripe credit card checkout.*";
        }
        // Intent K: Contracts & Agreements Questions
        else if (msgLower.Contains("contract") || msgLower.Contains("agreement") || msgLower.Contains("esign") || msgLower.Contains("signature"))
        {
            fallbackReply = $"**Contracts & Digital Signatures**\n\n- **Total Contracts:** {totalContracts}\n- **Active / Signed:** **{signedContractsCount}** (${totalSignedContractsVal:N0} total signed value)\n\n*Tip: You can send tokenized public signing links for fast digital client signatures.*";
        }
        // Intent L: Tasks & Schedule Questions
        else if (msgLower.Contains("task") || msgLower.Contains("todo") || msgLower.Contains("activity") || msgLower.Contains("calendar") || msgLower.Contains("schedule"))
        {
            fallbackReply = $"**Operations & Tasks Summary**\n\n- **Pending Tasks:** **{pendingTasksCount}**\n- **Overdue Items:** **{overdueTasksCount}** ⚠️\n- **Total Logged Touchpoints:** {totalActivities} (Calls, Meetings, Emails)\n\n*Check the Tasks section to prioritize overdue action items.*";
        }
        // Intent M: General Business Strategy / Best Practice Advice
        else if (msgLower.StartsWith("how to") || msgLower.Contains("improve") || msgLower.Contains("strategy") || msgLower.Contains("best practice") || msgLower.Contains("tip"))
        {
            fallbackReply = $"**Sales & Operations Strategy Advice**\n\nHere are actionable best practices based on your current workspace:\n1. ⚡ **Lead Response Time:** Contact leads with scores above 70 within 15 minutes to increase win rates by up to 3x.\n2. 📈 **Pipeline Velocity:** Keep deals moving by establishing clear next steps after each client call (current pipeline: **${totalPipelineVal:N0}**).\n3. 💳 **Automated Follow-ups:** Send friendly payment reminders for pending invoices (currently **${totalOverdueInvoicesVal:N0}** overdue).\n4. ✍️ **Streamlined E-Signing:** Send contracts right after proposal acceptance to shorten sales cycles.";
        }
        // Intent N: General / Dynamic Fallback
        else
        {
            fallbackReply = $"I understand you are asking about: **\"{userMsg}\"**.\n\n- 📊 **Current Workspace Status:** {totalCustomers} Customers | {totalLeads} Leads ({hotLeadsCount} Hot) | ${totalPipelineVal:N0} Pipeline Value\n\nCould you please provide a little more detail or specify what you'd like to check? For example:\n- *\"Show me our hot leads\"*\n- *\"What is our pipeline value?\"*\n- *\"List products in the catalog\"*\n- *\"Check unpaid invoices\"*";
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
        var msgLower = msg.ToLower().Trim();

        // 1. Natural greeting for public visitors
        if (IsSimpleGreeting(msgLower))
        {
            return new CopilotChatResponse
            {
                Reply = "Hello! 👋 Welcome to our CRM platform. How can I help you today? Feel free to ask about our features, pricing, pipeline management, or demo access.",
                IsGeminiPowered = false,
                CurrentContextSummary = "Public Product Assistant"
            };
        }

        if (msgLower == "how are you" || msgLower == "how are you?")
        {
            return new CopilotChatResponse
            {
                Reply = "I'm doing great! Thank you for visiting. How can I assist you with exploring our CRM features today?",
                IsGeminiPowered = false,
                CurrentContextSummary = "Public Product Assistant"
            };
        }

        // Format history text
        var historyText = string.Empty;
        if (request?.History != null && request.History.Count > 0)
        {
            var lastHistory = request.History.TakeLast(6);
            historyText = string.Join("\n", lastHistory.Select(h => $"{h.Role.ToUpper()}: {h.Message}"));
        }

        // 2. Gemini LLM Product Specialist
        if (_geminiService.IsConfigured)
        {
            try
            {
                var systemPrompt = $"""
                    You are the friendly, intelligent Public Product Specialist for this Enterprise CRM platform.

                    BEHAVIOR RULES:
                    1. If the visitor says a greeting ("hi", "hello"), give a warm, natural 1-sentence greeting.
                    2. If they ask a CRM product question, answer clearly, concisely, and persuasively.
                    3. If they ask a general question, answer helpfully and accurately.
                    4. Keep responses structured and pleasant.

                    CRM PRODUCT HIGHLIGHTS:
                    - Customer & Corporate Account Management
                    - Automated AI Lead Scoring & 1-Click Conversion
                    - Drag-and-Drop Kanban Opportunity Pipeline
                    - Digital Contracts & Online E-Signatures
                    - Invoices with Stripe Credit Card Checkout
                    - Custom Fields & Field-Level Audit Trail
                    - Task Scheduling & Activity Timelines

                    CONVERSATION HISTORY:
                    {(string.IsNullOrWhiteSpace(historyText) ? "None" : historyText)}

                    CURRENT VISITOR QUESTION:
                    {msg}
                    """;

                var reply = await _geminiService.GenerateTextAsync(systemPrompt, request?.Attachment);
                if (!string.IsNullOrWhiteSpace(reply))
                {
                    return new CopilotChatResponse
                    {
                        Reply = reply,
                        IsGeminiPowered = true,
                        CurrentContextSummary = "Public Product Assistant"
                    };
                }
            }
            catch { }
        }

        // 3. Fallback Product Answers
        string fallbackReply;
        if (msgLower.Contains("pricing") || msgLower.Contains("cost") || msgLower.Contains("price") || msgLower.Contains("plan"))
        {
            fallbackReply = "**Flexible Pricing Plans**\n\nWe offer Starter, Professional, and Enterprise tiers tailored to your team size. All plans include full CRM pipelines, lead scoring, and invoicing.\n\n*Click **'Get Started'** at the top right to test the live demo!*";
        }
        else if (msgLower.Contains("stripe") || msgLower.Contains("payment") || msgLower.Contains("invoice"))
        {
            fallbackReply = "**Online Invoicing & Stripe Integration**\n\n- **Instant Checkout:** Clients can pay invoices online using credit cards via Stripe.\n- **Real-Time Sync:** Payment status updates automatically upon completed checkout.\n- **Automated Receipts:** Receipts and payment confirmations are generated instantly.";
        }
        else if (msgLower.Contains("contract") || msgLower.Contains("esign") || msgLower.Contains("sign"))
        {
            fallbackReply = "**Digital Contracts & E-Signatures**\n\n- **Shareable Links:** Send secure signing tokens directly to clients.\n- **Mobile-Friendly:** Clients can sign agreements online from any phone or browser.\n- **PDF Records:** Executed agreements export to PDF with complete audit timestamps.";
        }
        else if (msgLower.Contains("lead") || msgLower.Contains("score") || msgLower.Contains("convert"))
        {
            fallbackReply = "**AI Lead Scoring & Conversion**\n\n- **Predictive Scoring:** Prospects receive automatic Hot/Warm/Cold ratings (0–100).\n- **SLA Alerts:** Get notified before uncontacted leads go cold.\n- **1-Click Conversion:** Turn active leads into Customers, Companies, and Deals instantly.";
        }
        else
        {
            fallbackReply = $"Thank you for asking about **\"{msg}\"**!\n\nOur platform provides end-to-end customer management, Kanban sales pipelines, digital contracts, and Stripe billing.\n\n*Would you like to try out a live demo or learn more about specific features?*";
        }

        return new CopilotChatResponse
        {
            Reply = fallbackReply,
            IsGeminiPowered = false,
            CurrentContextSummary = "Public Product Assistant"
        };
    }

    private static bool IsSimpleGreeting(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var clean = Regex.Replace(text.ToLower().Trim(), @"[^\w\s]", "");
        var simpleGreetings = new HashSet<string>
        {
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
            "howdy", "sup", "greetings", "yo", "hola", "hi there", "hello there", "hey there"
        };
        return simpleGreetings.Contains(clean);
    }
}
