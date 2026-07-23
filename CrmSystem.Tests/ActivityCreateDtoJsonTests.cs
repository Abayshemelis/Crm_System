using System.Text.Json;
using CrmSystem.Domain.Dtos.Activity;

namespace CrmSystem.Tests;

public class ActivityCreateDtoJsonTests
{
    [Fact]
    public void Deserialize_AllowsActivityTypeIdProvidedAsString()
    {
        const string json = """
        {
          "activityTypeId": "7",
          "subject": "Follow up",
          "description": "Need to confirm",
          "activityDate": "2026-07-22T10:00:00Z"
        }
        """;

        var dto = JsonSerializer.Deserialize<ActivityCreateDto>(json);

        Assert.NotNull(dto);
        Assert.Equal(7, dto!.ActivityTypeId);
        Assert.Equal("Follow up", dto.Subject);
    }
}
