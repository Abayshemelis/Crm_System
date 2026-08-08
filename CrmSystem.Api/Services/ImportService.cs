using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CrmSystem.Api.Dtos;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Services
{
    public class ImportService : IImportService
    {
        private readonly AppDbContext _db;

        public ImportService(AppDbContext db)
        {
            _db = db;
        }

        public CsvHeaderParseResultDto ParseCsvHeaders(Stream csvStream)
        {
            using var reader = new StreamReader(csvStream, Encoding.UTF8, leaveOpen: true);
            var lines = new List<string>();
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                    lines.Add(line);
            }

            if (lines.Count == 0)
            {
                return new CsvHeaderParseResultDto();
            }

            var headers = ParseCsvLine(lines[0]);
            var previewRows = new List<Dictionary<string, string>>();

            for (int i = 1; i < Math.Min(lines.Count, 6); i++)
            {
                var fields = ParseCsvLine(lines[i]);
                var rowDict = new Dictionary<string, string>();
                for (int j = 0; j < headers.Count; j++)
                {
                    rowDict[headers[j]] = j < fields.Count ? fields[j] : string.Empty;
                }
                previewRows.Add(rowDict);
            }

            return new CsvHeaderParseResultDto
            {
                Headers = headers,
                PreviewRows = previewRows,
                TotalRows = lines.Count - 1
            };
        }

        public CsvHeaderParseResultDto ParsePdfHeaders(Stream pdfStream)
        {
            var extractedLines = new List<string>();

            try
            {
                using var pdf = UglyToad.PdfPig.PdfDocument.Open(pdfStream);
                foreach (var page in pdf.GetPages())
                {
                    var pageText = page.Text;
                    if (!string.IsNullOrWhiteSpace(pageText))
                    {
                        var lines = pageText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                        foreach (var l in lines)
                        {
                            var trimmed = l.Trim();
                            if (!string.IsNullOrWhiteSpace(trimmed))
                                extractedLines.Add(trimmed);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PDF Import] Error reading PDF stream: {ex.Message}");
            }

            if (extractedLines.Count == 0)
            {
                return new CsvHeaderParseResultDto();
            }

            // Detect if first line contains delimiter (comma, tab, pipe) or key-value format
            var firstLine = extractedLines[0];
            List<string> headers;

            if (firstLine.Contains(",") || firstLine.Contains("\t") || firstLine.Contains("|"))
            {
                char delimiter = firstLine.Contains(",") ? ',' : firstLine.Contains("\t") ? '\t' : '|';
                headers = firstLine.Split(delimiter).Select(h => h.Trim().Trim('"')).Where(h => !string.IsNullOrWhiteSpace(h)).ToList();

                var previewRows = new List<Dictionary<string, string>>();
                for (int i = 1; i < Math.Min(extractedLines.Count, 6); i++)
                {
                    var fields = extractedLines[i].Split(delimiter).Select(f => f.Trim().Trim('"')).ToList();
                    var rowDict = new Dictionary<string, string>();
                    for (int j = 0; j < headers.Count; j++)
                    {
                        rowDict[headers[j]] = j < fields.Count ? fields[j] : string.Empty;
                    }
                    previewRows.Add(rowDict);
                }

                return new CsvHeaderParseResultDto
                {
                    Headers = headers,
                    PreviewRows = previewRows,
                    TotalRows = Math.Max(0, extractedLines.Count - 1)
                };
            }
            else
            {
                // Key-value parsing format (e.g. "Name: John Doe", "Email: john@acme.com")
                headers = new List<string> { "First Name", "Last Name", "Email", "Phone", "Company Name", "Job Title", "Notes" };
                var previewRows = new List<Dictionary<string, string>>();
                var currentRecord = new Dictionary<string, string>();

                foreach (var line in extractedLines)
                {
                    if (line.Contains(":"))
                    {
                        var parts = line.Split(new[] { ':' }, 2);
                        var key = parts[0].Trim();
                        var val = parts[1].Trim();
                        currentRecord[key] = val;

                        if (currentRecord.Count >= 3)
                        {
                            if (previewRows.Count < 5) previewRows.Add(new Dictionary<string, string>(currentRecord));
                        }
                    }
                }

                if (previewRows.Count == 0 && currentRecord.Count > 0)
                {
                    previewRows.Add(currentRecord);
                }

                return new CsvHeaderParseResultDto
                {
                    Headers = headers,
                    PreviewRows = previewRows,
                    TotalRows = Math.Max(1, previewRows.Count)
                };
            }
        }

        public async Task<CsvImportResultDto> ExecuteImportAsync(CsvImportRequestDto request, int currentUserId)
        {
            var result = new CsvImportResultDto();

            if (string.IsNullOrWhiteSpace(request.FileContent))
            {
                result.ErrorMessages.Add("File content is empty.");
                return result;
            }

            var lines = request.FileContent
                .Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .ToList();

            if (lines.Count < 2)
            {
                result.ErrorMessages.Add("CSV must contain at least a header row and one data row.");
                return result;
            }

            var headers = ParseCsvLine(lines[0]);
            var mapping = request.ColumnMappings ?? new Dictionary<string, string>();

            // Get default status for leads if entity is lead
            int? defaultStatusId = null;
            if (request.EntityType.Equals("lead", StringComparison.OrdinalIgnoreCase))
            {
                var defaultStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "New")
                                    ?? await _db.LeadStatuses.FirstOrDefaultAsync();
                defaultStatusId = defaultStatus?.LeadStatusId;
            }

            for (int i = 1; i < lines.Count; i++)
            {
                result.TotalRecordsProcessed++;
                var fields = ParseCsvLine(lines[i]);
                var rowData = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                for (int j = 0; j < headers.Count; j++)
                {
                    var header = headers[j];
                    if (mapping.TryGetValue(header, out var mappedKey) && !string.IsNullOrWhiteSpace(mappedKey))
                    {
                        rowData[mappedKey] = j < fields.Count ? fields[j].Trim() : string.Empty;
                    }
                }

                try
                {
                    if (request.EntityType.Equals("lead", StringComparison.OrdinalIgnoreCase))
                    {
                        await ProcessLeadRowAsync(rowData, currentUserId, defaultStatusId);
                        result.SuccessCount++;
                    }
                    else if (request.EntityType.Equals("customer", StringComparison.OrdinalIgnoreCase))
                    {
                        await ProcessCustomerRowAsync(rowData, currentUserId);
                        result.SuccessCount++;
                    }
                    else if (request.EntityType.Equals("product", StringComparison.OrdinalIgnoreCase))
                    {
                        await ProcessProductRowAsync(rowData);
                        result.SuccessCount++;
                    }
                    else
                    {
                        result.FailureCount++;
                        result.ErrorMessages.Add($"Row {i}: Unsupported entity type '{request.EntityType}'.");
                    }
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.ErrorMessages.Add($"Row {i}: {ex.Message}");
                }
            }

            await _db.SaveChangesAsync();
            return result;
        }

        private async Task ProcessLeadRowAsync(Dictionary<string, string> data, int currentUserId, int? defaultStatusId)
        {
            var firstName = GetValue(data, "firstName", "first_name", "first", "name");
            var lastName = GetValue(data, "lastName", "last_name", "last");
            var email = GetValue(data, "email", "email_address");

            if (string.IsNullOrWhiteSpace(firstName))
            {
                if (!string.IsNullOrWhiteSpace(lastName))
                {
                    firstName = lastName;
                    lastName = "N/A";
                }
                else if (!string.IsNullOrWhiteSpace(email))
                {
                    firstName = email.Split('@')[0];
                    lastName = "Lead";
                }
                else
                {
                    throw new InvalidOperationException("Lead row requires a First Name or Email.");
                }
            }

            if (string.IsNullOrWhiteSpace(lastName))
            {
                lastName = "Prospect";
            }

            var phone = GetValue(data, "phone", "phone_number", "mobile");
            var companyName = GetValue(data, "companyName", "company_name", "company", "organization");
            var jobTitle = GetValue(data, "jobTitle", "job_title", "title", "position");
            var notes = GetValue(data, "notes", "description", "comments");
            var priority = GetValue(data, "priority");
            if (string.IsNullOrWhiteSpace(priority)) priority = "Medium";

            var lead = new Lead
            {
                FirstName = firstName,
                LastName = lastName,
                Email = string.IsNullOrWhiteSpace(email) ? null : email,
                Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
                CompanyName = string.IsNullOrWhiteSpace(companyName) ? null : companyName,
                JobTitle = string.IsNullOrWhiteSpace(jobTitle) ? null : jobTitle,
                Notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
                Priority = priority,
                LeadStatusId = defaultStatusId ?? 1,
                AssignedRepId = currentUserId,
                CreatedAt = DateTime.UtcNow
            };

            await _db.Leads.AddAsync(lead);
        }

        private async Task ProcessCustomerRowAsync(Dictionary<string, string> data, int currentUserId)
        {
            var firstName = GetValue(data, "firstName", "first_name", "first", "name");
            var lastName = GetValue(data, "lastName", "last_name", "last");
            var email = GetValue(data, "email", "email_address");

            if (string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName))
            {
                if (!string.IsNullOrWhiteSpace(email))
                {
                    firstName = email.Split('@')[0];
                    lastName = "Customer";
                }
                else
                {
                    throw new InvalidOperationException("Customer row requires a First Name, Last Name, or Email.");
                }
            }

            if (string.IsNullOrWhiteSpace(firstName)) firstName = "Valued";
            if (string.IsNullOrWhiteSpace(lastName)) lastName = "Customer";
            if (string.IsNullOrWhiteSpace(email)) email = $"{firstName.ToLower().Replace(" ", "")}.{DateTime.UtcNow.Ticks}@imported.com";

            var phone = GetValue(data, "phone", "phone_number", "mobile");
            var jobTitle = GetValue(data, "jobTitle", "job_title", "title");
            var companyName = GetValue(data, "companyName", "company_name", "company");

            int? companyId = null;
            if (!string.IsNullOrWhiteSpace(companyName))
            {
                var existingCompany = await _db.Companies.FirstOrDefaultAsync(c => c.Name.ToLower() == companyName.ToLower());
                if (existingCompany != null)
                {
                    companyId = existingCompany.CompanyId;
                }
                else
                {
                    var newCompany = new Company
                    {
                        Name = companyName,
                        AssignedRepId = currentUserId,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _db.Companies.AddAsync(newCompany);
                    await _db.SaveChangesAsync();
                    companyId = newCompany.CompanyId;
                }
            }

            var customer = new Customer
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
                JobTitle = string.IsNullOrWhiteSpace(jobTitle) ? null : jobTitle,
                CompanyId = companyId,
                AssignedRepId = currentUserId,
                CreatedAt = DateTime.UtcNow
            };

            await _db.Customers.AddAsync(customer);
        }

        private async Task ProcessProductRowAsync(Dictionary<string, string> data)
        {
            var name = GetValue(data, "name", "product_name", "title");
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new InvalidOperationException("Product row requires a Product Name.");
            }

            var sku = GetValue(data, "sku", "product_code", "code");
            if (string.IsNullOrWhiteSpace(sku))
            {
                sku = $"SKU-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
            }

            var priceStr = GetValue(data, "price", "unit_price", "cost");
            decimal price = 0;
            if (!string.IsNullOrWhiteSpace(priceStr))
            {
                decimal.TryParse(priceStr.Replace("$", "").Replace(",", "").Trim(), out price);
            }

            var description = GetValue(data, "description", "details");

            var product = new Product
            {
                Name = name,
                SKU = sku,
                Price = price,
                Description = string.IsNullOrWhiteSpace(description) ? null : description,
                ProductStatusId = 1,
                CreatedAt = DateTime.UtcNow
            };

            await _db.Products.AddAsync(product);
        }

        private static string GetValue(Dictionary<string, string> data, params string[] possibleKeys)
        {
            foreach (var key in possibleKeys)
            {
                if (data.TryGetValue(key, out var val) && !string.IsNullOrWhiteSpace(val))
                {
                    return val;
                }
            }
            return string.Empty;
        }

        private static List<string> ParseCsvLine(string line)
        {
            var result = new List<string>();
            var inQuotes = false;
            var sb = new StringBuilder();

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        sb.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(sb.ToString().Trim());
                    sb.Clear();
                }
                else
                {
                    sb.Append(c);
                }
            }

            result.Add(sb.ToString().Trim());
            return result;
        }
    }
}
