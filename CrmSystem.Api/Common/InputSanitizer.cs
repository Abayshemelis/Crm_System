using System;
using System.Text.RegularExpressions;

namespace CrmSystem.Api.Common;

public static class InputSanitizer
{
    private static readonly Regex ScriptTagRegex = new(@"<script[^>]*>[\s\S]*?</script>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex HtmlTagRegex = new(@"<[^>]+>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex JavascriptUriRegex = new(@"javascript\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex OnEventRegex = new(@"\s+on\w+\s*=", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Strips harmful script tags, inline event handlers, and javascript pseudo-protocol URIs.
    /// Preserves normal punctuation and text.
    /// </summary>
    public static string? SanitizeText(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return input;
        }

        var cleaned = ScriptTagRegex.Replace(input, string.Empty);
        cleaned = JavascriptUriRegex.Replace(cleaned, string.Empty);
        cleaned = OnEventRegex.Replace(cleaned, " ");

        return cleaned.Trim();
    }

    /// <summary>
    /// Strictly strips all HTML tags for plain text fields (e.g. Names, Phone, Titles).
    /// </summary>
    public static string? StripHtml(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return input;
        }

        var cleaned = ScriptTagRegex.Replace(input, string.Empty);
        cleaned = HtmlTagRegex.Replace(cleaned, string.Empty);
        cleaned = JavascriptUriRegex.Replace(cleaned, string.Empty);

        return cleaned.Trim();
    }
}
