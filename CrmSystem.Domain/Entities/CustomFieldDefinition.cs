namespace CrmSystem.Domain.Entities;

public class CustomFieldDefinition
{
    public int CustomFieldDefinitionId { get; set; }
    
    // e.g., "Customer", "Lead", "Company"
    public string EntityType { get; set; } = string.Empty;
    
    // User-facing name of the field (e.g. "Industry Type", "Project Code")
    public string FieldName { get; set; } = string.Empty;
    
    // "Text", "Number", "Dropdown", "Date"
    public string FieldType { get; set; } = "Text";
    
    // JSON string for dropdown options (e.g. ["Option 1", "Option 2"])
    public string? OptionsJson { get; set; }
    
    public int SortOrder { get; set; }
}
