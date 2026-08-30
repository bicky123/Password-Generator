import createRouter, { Request, Response, NextFunction } from 'lambda-api';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  generatePassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PasswordOptions,
} from '../services/password-generator';

const api = createRouter({
  logger: false,
});

// Enable CORS middleware for all routes
api.use((req: Request, res: Response, next: NextFunction) => {
  res.cors({
    origin: '*',
    headers: 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    methods: 'GET,POST,OPTIONS',
  });
  next();
});

function parseBooleanParam(name: string, value: any): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1') {
      return true;
    }
    if (lower === 'false' || lower === '0') {
      return false;
    }
  }
  throw new Error(`Invalid boolean value for parameter '${name}': expected 'true' or 'false', got '${value}'`);
}

function parseLengthParam(value: any): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    parsed = Number(trimmed);
  } else {
    throw new Error(`Invalid parameter 'length': must be an integer, got '${value}'`);
  }

  if (!Number.isInteger(parsed) || isNaN(parsed)) {
    throw new Error(`Invalid parameter 'length': must be an integer, got '${value}'`);
  }
  if (parsed < MIN_PASSWORD_LENGTH || parsed > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Parameter 'length' out of range: must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}, got ${parsed}`
    );
  }
  return parsed;
}

// Controller for generating password (supports both POST JSON body and GET query parameters)
const handleGeneratePassword = (req: Request, res: Response) => {
  const input = {
    ...(req.query || {}),
    ...(typeof req.body === 'object' && req.body !== null ? req.body : {}),
  };

  const options: PasswordOptions = {
    length: parseLengthParam(input.length),
    includeSymbols: parseBooleanParam('includeSymbols', input.includeSymbols),
    includeNumbers: parseBooleanParam('includeNumbers', input.includeNumbers),
    includeUppercase: parseBooleanParam('includeUppercase', input.includeUppercase),
  };

  const result = generatePassword(options);

  return res.status(200).json({
    success: true,
    data: result,
  });
};

// Route handlers for POST and GET /generate-password
api.post('/generate-password', handleGeneratePassword);
api.get('/generate-password', handleGeneratePassword);
api.options('/generate-password', (_req: Request, res: Response) => res.sendStatus(204));

// Global error handling middleware
api.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error in request:', err);

  const isValidationError =
    err.message.includes('Invalid') ||
    err.message.includes('out of range') ||
    err.message.includes('Password length must be') ||
    err.message.includes('character set must be enabled');

  const statusCode = isValidationError ? 400 : 500;

  return res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal server error occurred while generating password.',
      statusCode,
    },
  });
});

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context = {} as Context
): Promise<APIGatewayProxyResult> => {
  return (await api.run(event, context)) as APIGatewayProxyResult;
};

export { api };
