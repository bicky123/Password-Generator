import * as crypto from 'crypto';

export interface PasswordOptions {
  length?: number;
  includeSymbols?: boolean;
  includeNumbers?: boolean;
  includeUppercase?: boolean;
}

export interface PasswordResult {
  password: string;
  length: number;
  constraints: {
    includeSymbols: boolean;
    includeNumbers: boolean;
    includeUppercase: boolean;
    includeLowercase: boolean;
  };
}

export const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
export const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NUMBER_CHARS = '0123456789';
export const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const DEFAULT_PASSWORD_LENGTH = 16;

/**
 * Generates a cryptographically secure random password based on the provided options.
 */
export function generatePassword(options: PasswordOptions = {}): PasswordResult {
  const length = options.length ?? DEFAULT_PASSWORD_LENGTH;
  const includeSymbols = options.includeSymbols ?? true;
  const includeNumbers = options.includeNumbers ?? true;
  const includeUppercase = options.includeUppercase ?? true;
  const includeLowercase = true; // Always active to ensure a strong base

  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Password length must be an integer between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}. Received: ${options.length}`
    );
  }

  // Build character pools
  const pools: string[] = [LOWERCASE_CHARS];
  if (includeUppercase) pools.push(UPPERCASE_CHARS);
  if (includeNumbers) pools.push(NUMBER_CHARS);
  if (includeSymbols) pools.push(SYMBOL_CHARS);

  const combinedPool = pools.join('');
  if (combinedPool.length === 0) {
    throw new Error('At least one character set must be enabled.');
  }

  const passwordChars: string[] = [];

  // Guarantee at least one character from each active character pool
  for (const pool of pools) {
    const randomIndex = crypto.randomInt(0, pool.length);
    passwordChars.push(pool[randomIndex]);
  }

  // Fill the remaining length with uniformly sampled random characters from the combined pool
  while (passwordChars.length < length) {
    const randomIndex = crypto.randomInt(0, combinedPool.length);
    passwordChars.push(combinedPool[randomIndex]);
  }

  // Cryptographically secure Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return {
    password: passwordChars.join(''),
    length,
    constraints: {
      includeSymbols,
      includeNumbers,
      includeUppercase,
      includeLowercase,
    },
  };
}
