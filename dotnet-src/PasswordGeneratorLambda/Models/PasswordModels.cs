using System.Text.Json.Serialization;

namespace PasswordGeneratorLambda.Models;

public class PasswordOptions
{
    [JsonPropertyName("length")]
    public int? Length { get; set; }

    [JsonPropertyName("includeSymbols")]
    public bool? IncludeSymbols { get; set; }

    [JsonPropertyName("includeNumbers")]
    public bool? IncludeNumbers { get; set; }

    [JsonPropertyName("includeUppercase")]
    public bool? IncludeUppercase { get; set; }
}

public class PasswordConstraints
{
    [JsonPropertyName("includeSymbols")]
    public bool IncludeSymbols { get; set; }

    [JsonPropertyName("includeNumbers")]
    public bool IncludeNumbers { get; set; }

    [JsonPropertyName("includeUppercase")]
    public bool IncludeUppercase { get; set; }

    [JsonPropertyName("includeLowercase")]
    public bool IncludeLowercase { get; set; }
}

public class PasswordResult
{
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("length")]
    public int Length { get; set; }

    [JsonPropertyName("constraints")]
    public PasswordConstraints Constraints { get; set; } = new();
}

public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    [JsonPropertyName("data")]
    public T Data { get; set; } = default!;
}

public class ApiErrorDetail
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("statusCode")]
    public int StatusCode { get; set; }
}

public class ApiErrorResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; } = false;

    [JsonPropertyName("error")]
    public ApiErrorDetail Error { get; set; } = new();
}
