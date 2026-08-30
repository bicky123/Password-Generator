# Serverless Password Generator (AWS CDK v2 & Node.js)

A production-ready serverless REST API built with **AWS CDK (v2)**, **TypeScript**, **Amazon API Gateway**, and **AWS Lambda** (Node.js 20.x) to generate cryptographically secure passwords.

---

## Architecture Overview

```
+------------------+         +--------------------------+         +-------------------------------+
|                  |  GET    |                          | Proxy   |                               |
|   Client / Web   | ------> |  Amazon API Gateway      | ------> |  AWS Lambda (Node.js 20.x)    |
|   Application    | <------ |  /generate-password      | <------ |  Node.js `crypto` Module      |
|                  |  JSON   |  (CORS Enabled)          |  JSON   |                               |
+------------------+         +--------------------------+         +-------------------------------+
                                                                                  |
                                                                                  v
                                                                      +-----------------------+
                                                                      | CloudWatch Logs       |
                                                                      | (7-Day Retention)     |
                                                                      +-----------------------+
```

### Key Features
- **Cryptographically Secure Randomness**: Uses Node.js `crypto.randomInt` for uniform distribution and protection against predictability.
- **Customizable Constraints**: Configurable `length` (8–128), `includeSymbols`, `includeNumbers`, and `includeUppercase`.
- **Guaranteed Character Types**: Ensures at least one character from each enabled pool is present, followed by a Fisher-Yates shuffle.
- **Full CORS Support**: Pre-configured preflight `OPTIONS` and CORS headers (`Access-Control-Allow-Origin: *`).
- **AWS CDK v2 with `NodejsFunction`**: Automated bundling and minification using `esbuild`.
- **Infrastructure as Code (IaC)**: Automated log retention, least privilege IAM policies, and CloudFormation outputs.

---

## Project Structure

```
.
├── bin/
│   └── app.ts                      # CDK Application entrypoint
├── lib/
│   └── password-generator-stack.ts # CDK Stack definition (Lambda, API GW, Logs)
├── src/
│   ├── handlers/
│   │   └── generate-password.ts    # Lambda entry handler with API Gateway proxy logic
│   └── services/
│       └── password-generator.ts   # Core cryptographically secure password generation logic
├── test/
│   ├── handler.test.ts             # Lambda handler unit tests
│   ├── password-generator.test.ts  # Service unit tests
│   └── stack.test.ts               # CDK infrastructure assertions
├── cdk.json                        # CDK runtime configuration
├── jest.config.js                  # Jest test configuration
├── package.json                    # Project metadata & dependencies
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Documentation & instructions
```

---

## Prerequisites

- **Node.js**: v18+ or v20+ recommended
- **AWS CLI**: Configured with appropriate AWS credentials (`aws configure`)
- **AWS CDK CLI**: Installed globally or executed via `npx cdk`

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Tests
```bash
npm test
```

### 3. Build & Synthesize CloudFormation Template
```bash
# Build TypeScript
npm run build

# Synthesize CloudFormation template
npx cdk synth
```

---

## Deployment

### 1. Bootstrap AWS Environment (First Time Only)
If you haven't deployed CDK applications to your AWS account/region before:
```bash
npx cdk bootstrap
```

### 2. Deploy the Stack
```bash
npx cdk deploy
```

Upon successful deployment, CDK will output the endpoint URLs:
```
Outputs:
PasswordGeneratorStack.ApiEndpointUrl = https://<api-id>.execute-api.<region>.amazonaws.com/prod/
PasswordGeneratorStack.GeneratePasswordEndpointUrl = https://<api-id>.execute-api.<region>.amazonaws.com/prod/generate-password
PasswordGeneratorStack.LambdaFunctionArn = arn:aws:lambda:<region>:<account-id>:function:PasswordGeneratorStack-...
```

---

## API Reference

### `GET /generate-password`

Generates a secure password based on query parameters.

#### Query Parameters

| Parameter | Type | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `length` | `integer` | `16` | Min: `8`, Max: `128` | Total length of the generated password |
| `includeSymbols` | `boolean` | `true` | `true`, `false`, `1`, `0` | Include special symbols (`!@#$%^&*()_+-=[]{}...`) |
| `includeNumbers` | `boolean` | `true` | `true`, `false`, `1`, `0` | Include numeric digits (`0-9`) |
| `includeUppercase` | `boolean` | `true` | `true`, `false`, `1`, `0` | Include uppercase letters (`A-Z`) |

*(Lowercase letters `a-z` are always included by default)*

---

### Example Requests & Responses

#### 1. Default Request (16 characters, all sets included)
```bash
curl -X GET "https://<api-id>.execute-api.<region>.amazonaws.com/prod/generate-password"
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "password": "k9#R!vL2p@W8xQ&1",
    "length": 16,
    "constraints": {
      "includeSymbols": true,
      "includeNumbers": true,
      "includeUppercase": true,
      "includeLowercase": true
    }
  }
}
```

#### 2. Custom Length & Exclude Symbols
```bash
curl -X GET "https://<api-id>.execute-api.<region>.amazonaws.com/prod/generate-password?length=24&includeSymbols=false"
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "password": "N7xK4p9Qw2La8Vm3Yb1Tr5Zs",
    "length": 24,
    "constraints": {
      "includeSymbols": false,
      "includeNumbers": true,
      "includeUppercase": true,
      "includeLowercase": true
    }
  }
}
```

#### 3. Error Handling Example (Length Out of Range)
```bash
curl -X GET "https://<api-id>.execute-api.<region>.amazonaws.com/prod/generate-password?length=4"
```

**Response (`400 Bad Request`)**:
```json
{
  "success": false,
  "error": {
    "message": "Parameter 'length' out of range: must be between 8 and 128, got 4",
    "statusCode": 400
  }
}
```

---

## Clean Up (Destroy Stack)

To avoid recurring AWS charges when no longer needed:
```bash
npx cdk destroy
```
