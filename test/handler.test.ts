import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/handlers/generate-password';

function createMockEvent(
  options: {
    queryParams?: Record<string, string> | null;
    body?: any;
    httpMethod?: string;
  } = {}
): APIGatewayProxyEvent {
  const { queryParams = null, body = null, httpMethod = 'POST' } = options;
  const serializedBody = body !== null ? JSON.stringify(body) : null;

  return {
    body: serializedBody,
    headers: {
      'content-type': 'application/json',
    },
    multiValueHeaders: {},
    httpMethod,
    isBase64Encoded: false,
    path: '/generate-password',
    pathParameters: null,
    queryStringParameters: queryParams,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: {},
      protocol: 'HTTP/1.1',
      httpMethod,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
      path: '/prod/generate-password',
      stage: 'prod',
      requestId: 'test-request-id',
      requestTimeEpoch: 12345678,
      resourceId: 'test-resource',
      resourcePath: '/generate-password',
    },
    resource: '/generate-password',
  };
}

function getHeader(response: any, headerName: string): string | undefined {
  const lower = headerName.toLowerCase();
  if (response.headers) {
    for (const key of Object.keys(response.headers)) {
      if (key.toLowerCase() === lower) return response.headers[key];
    }
  }
  if (response.multiValueHeaders) {
    for (const key of Object.keys(response.multiValueHeaders)) {
      if (key.toLowerCase() === lower) return response.multiValueHeaders[key][0];
    }
  }
  return undefined;
}

describe('Lambda Handler (generate-password)', () => {
  describe('POST /generate-password', () => {
    test('should return 200 with default parameters when empty body provided', async () => {
      const event = createMockEvent({ httpMethod: 'POST', body: {} });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(getHeader(response, 'access-control-allow-origin')).toBe('*');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(16);
      expect(body.data.password).toHaveLength(16);
      expect(body.data.constraints.includeSymbols).toBe(true);
      expect(body.data.constraints.includeNumbers).toBe(true);
      expect(body.data.constraints.includeUppercase).toBe(true);
      expect(body.data.constraints.includeLowercase).toBe(true);
    });

    test('should parse custom JSON body parameters correctly', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: {
          length: 32,
          includeSymbols: false,
          includeNumbers: true,
          includeUppercase: false,
        },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(32);
      expect(body.data.password).toHaveLength(32);
      expect(body.data.constraints.includeSymbols).toBe(false);
      expect(body.data.constraints.includeNumbers).toBe(true);
      expect(body.data.constraints.includeUppercase).toBe(false);
    });

    test('should accept numeric 1/0 for boolean parameters in body', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: {
          includeSymbols: 0,
          includeNumbers: 1,
        },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.constraints.includeSymbols).toBe(false);
      expect(body.data.constraints.includeNumbers).toBe(true);
    });

    test('should return 400 when length is out of range', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: { length: 5 },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Parameter 'length' out of range");
    });

    test('should return 400 when length is not an integer', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: { length: 'invalid' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Invalid parameter 'length'");
    });

    test('should return 400 when boolean parameter is invalid', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: { includeSymbols: 'maybe' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Invalid boolean value for parameter 'includeSymbols'");
    });
  });

  describe('GET /generate-password & OPTIONS', () => {
    test('should support GET request with query parameters', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        queryParams: { length: '20' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(20);
    });

    test('should handle OPTIONS preflight request with 204 or 200', async () => {
      const event = createMockEvent({ httpMethod: 'OPTIONS' });
      const response = await handler(event);

      expect([200, 204]).toContain(response.statusCode);
      expect(getHeader(response, 'access-control-allow-origin')).toBe('*');
    });
  });
});
