import {
  generatePassword,
  LOWERCASE_CHARS,
  UPPERCASE_CHARS,
  NUMBER_CHARS,
  SYMBOL_CHARS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  DEFAULT_PASSWORD_LENGTH,
} from '../src/services/password-generator';

describe('Password Generator Service', () => {
  test('should generate default password with length 16 and all character sets', () => {
    const result = generatePassword();
    expect(result.password).toHaveLength(DEFAULT_PASSWORD_LENGTH);
    expect(result.length).toBe(DEFAULT_PASSWORD_LENGTH);
    expect(result.constraints.includeSymbols).toBe(true);
    expect(result.constraints.includeNumbers).toBe(true);
    expect(result.constraints.includeUppercase).toBe(true);
    expect(result.constraints.includeLowercase).toBe(true);

    // Verify character presence
    const hasLowercase = [...result.password].some((c) => LOWERCASE_CHARS.includes(c));
    const hasUppercase = [...result.password].some((c) => UPPERCASE_CHARS.includes(c));
    const hasNumber = [...result.password].some((c) => NUMBER_CHARS.includes(c));
    const hasSymbol = [...result.password].some((c) => SYMBOL_CHARS.includes(c));

    expect(hasLowercase).toBe(true);
    expect(hasUppercase).toBe(true);
    expect(hasNumber).toBe(true);
    expect(hasSymbol).toBe(true);
  });

  test('should generate password of specific requested length within valid range', () => {
    const lengths = [8, 12, 24, 32, 64, 128];
    for (const len of lengths) {
      const result = generatePassword({ length: len });
      expect(result.password).toHaveLength(len);
      expect(result.length).toBe(len);
    }
  });

  test('should exclude symbols when includeSymbols is false', () => {
    for (let i = 0; i < 10; i++) {
      const result = generatePassword({ includeSymbols: false });
      const hasSymbol = [...result.password].some((c) => SYMBOL_CHARS.includes(c));
      expect(hasSymbol).toBe(false);
      expect(result.constraints.includeSymbols).toBe(false);
    }
  });

  test('should exclude numbers when includeNumbers is false', () => {
    for (let i = 0; i < 10; i++) {
      const result = generatePassword({ includeNumbers: false });
      const hasNumber = [...result.password].some((c) => NUMBER_CHARS.includes(c));
      expect(hasNumber).toBe(false);
      expect(result.constraints.includeNumbers).toBe(false);
    }
  });

  test('should exclude uppercase when includeUppercase is false', () => {
    for (let i = 0; i < 10; i++) {
      const result = generatePassword({ includeUppercase: false });
      const hasUppercase = [...result.password].some((c) => UPPERCASE_CHARS.includes(c));
      expect(hasUppercase).toBe(false);
      expect(result.constraints.includeUppercase).toBe(false);
    }
  });

  test('should generate lowercase-only password when all other sets are disabled', () => {
    const result = generatePassword({
      includeSymbols: false,
      includeNumbers: false,
      includeUppercase: false,
    });
    expect(result.password).toHaveLength(16);
    for (const char of result.password) {
      expect(LOWERCASE_CHARS).toContain(char);
    }
  });

  test('should throw error when length is less than MIN_PASSWORD_LENGTH', () => {
    expect(() => generatePassword({ length: 7 })).toThrow(
      `Password length must be an integer between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`
    );
  });

  test('should throw error when length is greater than MAX_PASSWORD_LENGTH', () => {
    expect(() => generatePassword({ length: 129 })).toThrow(
      `Password length must be an integer between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`
    );
  });

  test('should throw error when length is not an integer', () => {
    expect(() => generatePassword({ length: 16.5 })).toThrow(
      `Password length must be an integer between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`
    );
  });
});
