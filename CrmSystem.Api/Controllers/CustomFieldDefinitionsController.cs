using CrmSystem.Api.Dtos;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.Controllers;

public record CreateCustomFieldDefinitionRequest(
    [Required][MaxLength(50)] string EntityType,
    [Required][MaxLength(100)] string FieldName,
    [Required][MaxLength(50)] string FieldType,
    [MaxLength(2000)] string? OptionsJson,
    int SortOrder = 0);

public record UpdateCustomFieldDefinitionRequest(
    [Required][MaxLength(100)] string FieldName,
    [Required][MaxLength(50)] string FieldType,
    [MaxLength(2000)] string? OptionsJson,
    int SortOrder = 0);

public record CustomFieldDefinitionDto(
    int CustomFieldDefinitionId,
    string EntityType,
    string FieldName,
    string FieldType,
    string? OptionsJson,
    int SortOrder);

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/custom-field-definitions")]
public class CustomFieldDefinitionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CustomFieldDefinitionsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [AllowAnonymous] // Anyone logged in needs to fetch these for forms
    public async Task<ActionResult<IReadOnlyList<CustomFieldDefinitionDto>>> GetAll([FromQuery] string? entityType)
    {
        var query = _db.CustomFieldDefinitions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(c => c.EntityType == entityType);
        }

        var items = await query
            .OrderBy(c => c.EntityType)
            .ThenBy(c => c.SortOrder)
            .ThenBy(c => c.FieldName)
            .Select(c => new CustomFieldDefinitionDto(
                c.CustomFieldDefinitionId,
                c.EntityType,
                c.FieldName,
                c.FieldType,
                c.OptionsJson,
                c.SortOrder))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<CustomFieldDefinitionDto>> Create(CreateCustomFieldDefinitionRequest request)
    {
        if (await _db.CustomFieldDefinitions.AnyAsync(c => c.EntityType == request.EntityType && c.FieldName == request.FieldName))
        {
            return BadRequest(new { message = "A field with this name already exists for this entity type." });
        }

        var def = new CustomFieldDefinition
        {
            EntityType = request.EntityType.Trim(),
            FieldName = request.FieldName.Trim(),
            FieldType = request.FieldType.Trim(),
            OptionsJson = request.OptionsJson,
            SortOrder = request.SortOrder
        };

        _db.CustomFieldDefinitions.Add(def);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = def.CustomFieldDefinitionId }, new CustomFieldDefinitionDto(
            def.CustomFieldDefinitionId,
            def.EntityType,
            def.FieldName,
            def.FieldType,
            def.OptionsJson,
            def.SortOrder));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomFieldDefinitionDto>> Update(int id, UpdateCustomFieldDefinitionRequest request)
    {
        var def = await _db.CustomFieldDefinitions.FindAsync(id);
        if (def == null) return NotFound();

        if (def.FieldName != request.FieldName.Trim() && await _db.CustomFieldDefinitions.AnyAsync(c => c.EntityType == def.EntityType && c.FieldName == request.FieldName.Trim()))
        {
            return BadRequest(new { message = "A field with this name already exists for this entity type." });
        }

        def.FieldName = request.FieldName.Trim();
        def.FieldType = request.FieldType.Trim();
        def.OptionsJson = request.OptionsJson;
        def.SortOrder = request.SortOrder;

        await _db.SaveChangesAsync();

        return Ok(new CustomFieldDefinitionDto(
            def.CustomFieldDefinitionId,
            def.EntityType,
            def.FieldName,
            def.FieldType,
            def.OptionsJson,
            def.SortOrder));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var def = await _db.CustomFieldDefinitions.FindAsync(id);
        if (def == null) return NotFound();

        _db.CustomFieldDefinitions.Remove(def);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
