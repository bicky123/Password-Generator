using System.Text.Json;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using PasswordGeneratorLambda;
using PasswordGeneratorLambda.Models;
using PasswordGeneratorLambda.Services;

namespace TestRunner;

public class MockLambdaContext : ILambdaContext
{
    public string AwsRequestId { get; set; } = Guid.NewGuid().ToString();
    public IClientContext? ClientContext { get; set; }
    public string FunctionName { get; set; } = "PasswordGeneratorLambda";
    public string FunctionVersion { get; set; } = "1";
    public ICognitoIdentity? Identity { get; set; }
    public string InvokedFunctionArn { get; set; } = "arn:aws:lambda:us-east-1:123456789012:function:PasswordGenerator";
    public ILambdaLogger Logger { get; set; } = new MockLogger();
    public string LogGroupName { get; set; } = "/aws/lambda/PasswordGenerator";
    public string LogStreamName { get; set; } = "2026/09/12/[$LATEST]mock";
    public int MemoryLimitInMB { get; set; } = 256;
    public TimeSpan RemainingTime { get; set; } = TimeSpan.FromSeconds(10);
}

public class MockLogger : ILambdaLogger
{
    public void Log(string message) => Console.WriteLine($"[LAMBDA] {message}");
    public void LogLine(string message) => Console.WriteLine($"[LAMBDA] {message}");
}

public static class Program
{
    private static int _passed = 0;
    private static int _failed = 0;

    public static int Main()
    {
        Console.WriteLine("========================================");
        Console.WriteLine("Running .NET Lambda Unit & Integration Tests");
        Console.WriteLine("========================================");

        RunTest("GeneratePassword - Default options (16 chars, all pools)", () =>
        {
            var result = PasswordGeneratorService.GeneratePassword();
            Assert(result != null, "Result should not be null");
            Assert(result!.Length == 16, "Length should be 16");
            Assert(result.Password.Length == 16, "Password string length should be 16");
            Assert(result.Constraints.IncludeUppercase, "IncludeUppercase should be true");
            Assert(result.Constraints.IncludeLowercase, "IncludeLowercase should be true");
            Assert(result.Constraints.IncludeNumbers, "IncludeNumbers should be true");
            Assert(result.Constraints.IncludeSymbols, "IncludeSymbols should be true");

            Assert(result.Password.Any(c => PasswordGeneratorService.LowercaseChars.Contains(c)), "Should contain lowercase");
            Assert(result.Password.Any(c => PasswordGeneratorService.UppercaseChars.Contains(c)), "Should contain uppercase");
            Assert(result.Password.Any(c => PasswordGeneratorService.NumberChars.Contains(c)), "Should contain number");
            Assert(result.Password.Any(c => PasswordGeneratorService.SymbolChars.Contains(c)), "Should contain symbol");
        });

        RunTest("GeneratePassword - Custom lengths (8, 32, 64, 128)", () =>
        {
            foreach (var len in new[] { 8, 32, 64, 128 })
            {
                var result = PasswordGeneratorService.GeneratePassword(new PasswordOptions { Length = len });
                Assert(result.Length == len, $"Length should be {len}");
                Assert(result.Password.Length == len, $"Password string length should be {len}");
            }
        });

        RunTest("GeneratePassword - Validation error for length < 8 or > 128", () =>
        {
            foreach (var invalidLen in new[] { 7, 129, 0, -5 })
            {
                bool threw = false;
                try
                {
                    PasswordGeneratorService.GeneratePassword(new PasswordOptions { Length = invalidLen });
                }
                catch (ArgumentException)
                {
                    threw = true;
                }
                Assert(threw, $"Should have thrown ArgumentException for length {invalidLen}");
            }
        });

        RunTest("GeneratePassword - Exclude symbols and numbers", () =>
        {
            var result = PasswordGeneratorService.GeneratePassword(new PasswordOptions
            {
                Length = 24,
                IncludeSymbols = false,
                IncludeNumbers = false,
                IncludeUppercase = true
            });
            Assert(result.Password.Length == 24, "Length should be 24");
            Assert(!result.Password.Any(c => PasswordGeneratorService.SymbolChars.Contains(c)), "Should NOT contain symbols");
            Assert(!result.Password.Any(c => PasswordGeneratorService.NumberChars.Contains(c)), "Should NOT contain numbers");
            Assert(result.Password.Any(c => PasswordGeneratorService.UppercaseChars.Contains(c)), "Should contain uppercase");
            Assert(result.Password.Any(c => PasswordGeneratorService.LowercaseChars.Contains(c)), "Should contain lowercase");
        });

        RunTest("FunctionHandler - GET /generate-password query parameters", () =>
        {
            var function = new Function();
            var req = new APIGatewayProxyRequest
            {
                HttpMethod = "GET",
                Path = "/generate-password",
                QueryStringParameters = new Dictionary<string, string>
                {
                    { "length", "20" },
                    { "includeSymbols", "false" },
                    { "includeNumbers", "true" },
                    { "includeUppercase", "true" }
                }
            };
            var resp = function.FunctionHandler(req, new MockLambdaContext());
            Assert(resp.StatusCode == 200, $"Expected 200, got {resp.StatusCode}");
            Assert(resp.Headers.ContainsKey("Access-Control-Allow-Origin"), "Missing CORS header");
            
            using var doc = JsonDocument.Parse(resp.Body);
            Assert(doc.RootElement.GetProperty("success").GetBoolean(), "Expected success=true");
            var data = doc.RootElement.GetProperty("data");
            Assert(data.GetProperty("length").GetInt32() == 20, "Expected length=20");
            Assert(data.GetProperty("password").GetString()!.Length == 20, "Expected password string length=20");
            Assert(!data.GetProperty("constraints").GetProperty("includeSymbols").GetBoolean(), "Expected includeSymbols=false");
        });

        RunTest("FunctionHandler - POST /generate-password JSON body", () =>
        {
            var function = new Function();
            var payload = JsonSerializer.Serialize(new PasswordOptions
            {
                Length = 30,
                IncludeSymbols = true,
                IncludeNumbers = true,
                IncludeUppercase = false
            });
            var req = new APIGatewayProxyRequest
            {
                HttpMethod = "POST",
                Path = "/generate-password",
                Body = payload
            };
            var resp = function.FunctionHandler(req, new MockLambdaContext());
            Assert(resp.StatusCode == 200, $"Expected 200, got {resp.StatusCode}");
            
            using var doc = JsonDocument.Parse(resp.Body);
            Assert(doc.RootElement.GetProperty("success").GetBoolean(), "Expected success=true");
            var data = doc.RootElement.GetProperty("data");
            Assert(data.GetProperty("length").GetInt32() == 30, "Expected length=30");
        });

        RunTest("FunctionHandler - Invalid length returns 400 Bad Request", () =>
        {
            var function = new Function();
            var req = new APIGatewayProxyRequest
            {
                HttpMethod = "GET",
                Path = "/generate-password",
                QueryStringParameters = new Dictionary<string, string>
                {
                    { "length", "4" }
                }
            };
            var resp = function.FunctionHandler(req, new MockLambdaContext());
            Assert(resp.StatusCode == 400, $"Expected 400, got {resp.StatusCode}");
            
            using var doc = JsonDocument.Parse(resp.Body);
            Assert(!doc.RootElement.GetProperty("success").GetBoolean(), "Expected success=false");
            Assert(doc.RootElement.GetProperty("error").GetProperty("statusCode").GetInt32() == 400, "Error statusCode should be 400");
            Assert(!string.IsNullOrEmpty(doc.RootElement.GetProperty("error").GetProperty("message").GetString()), "Error message should not be empty");
        });

        RunTest("FunctionHandler - OPTIONS /generate-password returns 204 No Content", () =>
        {
            var function = new Function();
            var req = new APIGatewayProxyRequest
            {
                HttpMethod = "OPTIONS",
                Path = "/generate-password"
            };
            var resp = function.FunctionHandler(req, new MockLambdaContext());
            Assert(resp.StatusCode == 204, $"Expected 204, got {resp.StatusCode}");
            Assert(resp.Headers.ContainsKey("Access-Control-Allow-Origin"), "Missing Access-Control-Allow-Origin");
            Assert(resp.Headers.ContainsKey("Access-Control-Allow-Methods"), "Missing Access-Control-Allow-Methods");
        });

        Console.WriteLine("========================================");
        Console.WriteLine($"Results: {_passed} Passed, {_failed} Failed");
        Console.WriteLine("========================================");

        return _failed > 0 ? 1 : 0;
    }

    private static void RunTest(string testName, Action testAction)
    {
        try
        {
            testAction();
            Console.WriteLine($" [PASS] {testName}");
            _passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($" [FAIL] {testName}");
            Console.WriteLine($"        {ex.Message}");
            _failed++;
        }
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception($"Assertion Failed: {message}");
        }
    }
}
