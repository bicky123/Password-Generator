using System.Text.Json;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using PasswordGeneratorLambda.Models;
using PasswordGeneratorLambda.Services;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace PasswordGeneratorLambda;

public class Function
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private static readonly Dictionary<string, string> CorsHeaders = new()
    {
        { "Access-Control-Allow-Origin", "*" },
        { "Access-Control-Allow-Headers", "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token" },
        { "Access-Control-Allow-Methods", "GET,POST,OPTIONS" },
        { "Content-Type", "application/json" }
    };

    public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        context.Logger.LogInformation($"HTTP Method: {request.HttpMethod}, Path: {request.Path}");

        // Handle CORS preflight OPTIONS
        if (string.Equals(request.HttpMethod, "OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            return new APIGatewayProxyResponse
            {
                StatusCode = 204,
                Headers = CorsHeaders,
                Body = string.Empty
            };
        }

        try
        {
            var options = new PasswordOptions();

            // 1. Parse Query String Parameters if present
            if (request.QueryStringParameters != null)
            {
                if (request.QueryStringParameters.TryGetValue("length", out var lengthStr) && !string.IsNullOrWhiteSpace(lengthStr))
                {
                    options.Length = ParseLengthParam(lengthStr);
                }

                if (request.QueryStringParameters.TryGetValue("includeSymbols", out var symbolsStr) && !string.IsNullOrWhiteSpace(symbolsStr))
                {
                    options.IncludeSymbols = ParseBooleanParam("includeSymbols", symbolsStr);
                }

                if (request.QueryStringParameters.TryGetValue("includeNumbers", out var numbersStr) && !string.IsNullOrWhiteSpace(numbersStr))
                {
                    options.IncludeNumbers = ParseBooleanParam("includeNumbers", numbersStr);
                }

                if (request.QueryStringParameters.TryGetValue("includeUppercase", out var uppercaseStr) && !string.IsNullOrWhiteSpace(uppercaseStr))
                {
                    options.IncludeUppercase = ParseBooleanParam("includeUppercase", uppercaseStr);
                }
            }

            // 2. Parse JSON Body for POST requests (merges/overrides)
            if (string.Equals(request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(request.Body))
            {
                try
                {
                    var bodyOptions = JsonSerializer.Deserialize<PasswordOptions>(request.Body, JsonOptions);
                    if (bodyOptions != null)
                    {
                        if (bodyOptions.Length.HasValue)
                        {
                            ValidateLength(bodyOptions.Length.Value);
                            options.Length = bodyOptions.Length.Value;
                        }
                        if (bodyOptions.IncludeSymbols.HasValue) options.IncludeSymbols = bodyOptions.IncludeSymbols;
                        if (bodyOptions.IncludeNumbers.HasValue) options.IncludeNumbers = bodyOptions.IncludeNumbers;
                        if (bodyOptions.IncludeUppercase.HasValue) options.IncludeUppercase = bodyOptions.IncludeUppercase;
                    }
                }
                catch (JsonException ex)
                {
                    throw new ArgumentException($"Invalid JSON payload in request body: {ex.Message}");
                }
            }

            // 3. Generate Password
            var result = PasswordGeneratorService.GeneratePassword(options);

            var apiResponse = new ApiResponse<PasswordResult>
            {
                Success = true,
                Data = result
            };

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Headers = CorsHeaders,
                Body = JsonSerializer.Serialize(apiResponse, JsonOptions)
            };
        }
        catch (ArgumentException ex)
        {
            context.Logger.LogWarning($"Validation Error: {ex.Message}");
            return CreateErrorResponse(400, ex.Message);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Internal Error: {ex}");
            return CreateErrorResponse(500, "Internal server error occurred while generating password.");
        }
    }

    private static bool ParseBooleanParam(string name, string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        if (lower is "true" or "1") return true;
        if (lower is "false" or "0") return false;

        throw new ArgumentException($"Invalid boolean value for parameter '{name}': expected 'true' or 'false', got '{value}'");
    }

    private static int ParseLengthParam(string value)
    {
        if (!int.TryParse(value.Trim(), out int parsed))
        {
            throw new ArgumentException($"Invalid parameter 'length': must be an integer, got '{value}'");
        }

        ValidateLength(parsed);
        return parsed;
    }

    private static void ValidateLength(int length)
    {
        if (length < PasswordGeneratorService.MinPasswordLength || length > PasswordGeneratorService.MaxPasswordLength)
        {
            throw new ArgumentException(
                $"Parameter 'length' out of range: must be between {PasswordGeneratorService.MinPasswordLength} and {PasswordGeneratorService.MaxPasswordLength}, got {length}"
            );
        }
    }

    private static APIGatewayProxyResponse CreateErrorResponse(int statusCode, string message)
    {
        var errorResponse = new ApiErrorResponse
        {
            Success = false,
            Error = new ApiErrorDetail
            {
                Message = message,
                StatusCode = statusCode
            }
        };

        return new APIGatewayProxyResponse
        {
            StatusCode = statusCode,
            Headers = CorsHeaders,
            Body = JsonSerializer.Serialize(errorResponse, JsonOptions)
        };
    }
}
