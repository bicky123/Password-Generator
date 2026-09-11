using System.Security.Cryptography;
using PasswordGeneratorLambda.Models;

namespace PasswordGeneratorLambda.Services;

public static class PasswordGeneratorService
{
    public const string LowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    public const string UppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    public const string NumberChars = "0123456789";
    public const string SymbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 128;
    public const int DefaultPasswordLength = 16;

    /// <summary>
    /// Generates a cryptographically secure random password based on the provided options.
    /// </summary>
    public static PasswordResult GeneratePassword(PasswordOptions? options = null)
    {
        var opts = options ?? new PasswordOptions();
        int length = opts.Length ?? DefaultPasswordLength;
        bool includeSymbols = opts.IncludeSymbols ?? true;
        bool includeNumbers = opts.IncludeNumbers ?? true;
        bool includeUppercase = opts.IncludeUppercase ?? true;
        const bool includeLowercase = true; // Always active to ensure a strong base

        if (length < MinPasswordLength || length > MaxPasswordLength)
        {
            throw new ArgumentException(
                $"Password length must be an integer between {MinPasswordLength} and {MaxPasswordLength}. Received: {opts.Length}"
            );
        }

        // Build character pools
        var pools = new List<string> { LowercaseChars };
        if (includeUppercase) pools.Add(UppercaseChars);
        if (includeNumbers) pools.Add(NumberChars);
        if (includeSymbols) pools.Add(SymbolChars);

        string combinedPool = string.Concat(pools);
        if (string.IsNullOrEmpty(combinedPool))
        {
            throw new ArgumentException("At least one character set must be enabled.");
        }

        var passwordChars = new List<char>(length);

        // Guarantee at least one character from each active character pool
        foreach (var pool in pools)
        {
            int randomIndex = RandomNumberGenerator.GetInt32(0, pool.Length);
            passwordChars.Add(pool[randomIndex]);
        }

        // Fill the remaining length with uniformly sampled random characters from the combined pool
        while (passwordChars.Count < length)
        {
            int randomIndex = RandomNumberGenerator.GetInt32(0, combinedPool.Length);
            passwordChars.Add(combinedPool[randomIndex]);
        }

        // Cryptographically secure Fisher-Yates shuffle
        for (int i = passwordChars.Count - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(0, i + 1);
            (passwordChars[i], passwordChars[j]) = (passwordChars[j], passwordChars[i]);
        }

        return new PasswordResult
        {
            Password = new string(passwordChars.ToArray()),
            Length = length,
            Constraints = new PasswordConstraints
            {
                IncludeSymbols = includeSymbols,
                IncludeNumbers = includeNumbers,
                IncludeUppercase = includeUppercase,
                IncludeLowercase = includeLowercase
            }
        };
    }
}
