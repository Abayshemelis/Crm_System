using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace CrmSystem.Api.Dtos;

public record ApiErrorResponse(int Status, string Title, IDictionary<string, string[]> Errors)
{
    public static ApiErrorResponse FromModelState(int status, string title, ModelStateDictionary modelState)
    {
        var errors = modelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray());

        return new ApiErrorResponse(status, title, errors);
    }
}
