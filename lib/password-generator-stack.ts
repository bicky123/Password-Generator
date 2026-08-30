import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface PasswordGeneratorStackProps extends cdk.StackProps {
  /**
   * Log retention period for CloudWatch Logs.
   * @default logs.RetentionDays.ONE_WEEK
   */
  logRetention?: logs.RetentionDays;
}

export class PasswordGeneratorStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly passwordFunction: nodejs.NodejsFunction;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props?: PasswordGeneratorStackProps) {
    super(scope, id, props);

    const logRetention = props?.logRetention ?? logs.RetentionDays.ONE_WEEK;

    // 1. Define explicit CloudWatch LogGroup
    this.logGroup = new logs.LogGroup(this, 'PasswordGeneratorLogGroup', {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Define Node.js Lambda function with NodejsFunction construct
    this.passwordFunction = new nodejs.NodejsFunction(this, 'PasswordGeneratorHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../src/handlers/generate-password.ts'),
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      logGroup: this.logGroup,
      architecture: lambda.Architecture.ARM_64, // Cost & performance optimized ARM64 architecture
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        format: nodejs.OutputFormat.CJS,
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      description: 'Serverless password generator using Node.js crypto and lambda-api',
    });

    // 3. Define Amazon API Gateway REST API with CORS configured
    this.api = new apigateway.RestApi(this, 'PasswordGeneratorApi', {
      restApiName: 'Password Generator Service',
      description: 'Serverless REST API to generate cryptographically secure passwords.',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: false,
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // 4. Define Lambda Integration
    const passwordIntegration = new apigateway.LambdaIntegration(this.passwordFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    // 5. Create /generate-password Resource with POST and GET Methods
    const generatePasswordResource = this.api.root.addResource('generate-password');

    const commonMethodResponses: apigateway.MethodResponse[] = [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Content-Type': true,
        },
      },
      {
        statusCode: '400',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Content-Type': true,
        },
      },
      {
        statusCode: '500',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Content-Type': true,
        },
      },
    ];

    // POST /generate-password
    generatePasswordResource.addMethod('POST', passwordIntegration, {
      operationName: 'GeneratePasswordPost',
      methodResponses: commonMethodResponses,
    });

    // GET /generate-password
    generatePasswordResource.addMethod('GET', passwordIntegration, {
      operationName: 'GeneratePasswordGet',
      requestParameters: {
        'method.request.querystring.length': false,
        'method.request.querystring.includeSymbols': false,
        'method.request.querystring.includeNumbers': false,
        'method.request.querystring.includeUppercase': false,
      },
      methodResponses: commonMethodResponses,
    });

    // 6. Stack Outputs
    new cdk.CfnOutput(this, 'ApiEndpointUrl', {
      value: this.api.url,
      description: 'Base URL of the Password Generator REST API',
      exportName: 'PasswordGeneratorApiBaseUrl',
    });

    new cdk.CfnOutput(this, 'GeneratePasswordEndpointUrl', {
      value: `${this.api.url}generate-password`,
      description: 'Direct endpoint to generate passwords via POST or GET',
      exportName: 'GeneratePasswordEndpointUrl',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.passwordFunction.functionArn,
      description: 'ARN of the Password Generator Lambda Function',
      exportName: 'PasswordGeneratorLambdaArn',
    });
  }
}
