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
  public readonly nodejsFunction: nodejs.NodejsFunction;
  public readonly dotnetFunction: lambda.Function;
  public readonly nodejsLogGroup: logs.LogGroup;
  public readonly dotnetLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props?: PasswordGeneratorStackProps) {
    super(scope, id, props);

    const logRetention = props?.logRetention ?? logs.RetentionDays.ONE_WEEK;

    // 1. Define CloudWatch LogGroups for both Lambdas
    this.nodejsLogGroup = new logs.LogGroup(this, 'NodejsPasswordGeneratorLogGroup', {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.dotnetLogGroup = new logs.LogGroup(this, 'DotnetPasswordGeneratorLogGroup', {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Define Node.js Lambda function
    this.nodejsFunction = new nodejs.NodejsFunction(this, 'NodejsPasswordGeneratorHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../src/handlers/generate-password.ts'),
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      logGroup: this.nodejsLogGroup,
      architecture: lambda.Architecture.ARM_64,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        format: nodejs.OutputFormat.CJS,
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      description: 'Serverless password generator using Node.js TypeScript and lambda-api',
    });

    // 3. Define .NET 10 Lambda function (provided.al2023 custom runtime)
    this.dotnetFunction = new lambda.Function(this, 'DotnetPasswordGeneratorHandler', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/dotnet-lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      logGroup: this.dotnetLogGroup,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1',
      },
      description: 'Serverless password generator using .NET 10 C# Lambda (provided.al2023)',
    });

    // 4. Define Amazon API Gateway REST API with CORS configured
    this.api = new apigateway.RestApi(this, 'PasswordGeneratorApi', {
      restApiName: 'Password Generator Service',
      description: 'Serverless REST API to generate cryptographically secure passwords (.NET & Node.js).',
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

    // 5. Define Lambda Integrations
    const nodejsIntegration = new apigateway.LambdaIntegration(this.nodejsFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    const dotnetIntegration = new apigateway.LambdaIntegration(this.dotnetFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

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

    const getRequestParameters = {
      'method.request.querystring.length': false,
      'method.request.querystring.includeSymbols': false,
      'method.request.querystring.includeNumbers': false,
      'method.request.querystring.includeUppercase': false,
    };

    // Helper to wire GET and POST methods
    const addGeneratePasswordMethods = (
      resource: apigateway.IResource,
      integration: apigateway.LambdaIntegration,
      prefix: string
    ) => {
      resource.addMethod('POST', integration, {
        operationName: `${prefix}GeneratePasswordPost`,
        methodResponses: commonMethodResponses,
      });

      resource.addMethod('GET', integration, {
        operationName: `${prefix}GeneratePasswordGet`,
        requestParameters: getRequestParameters,
        methodResponses: commonMethodResponses,
      });
    };

    // 6. Routes
    // Default route /generate-password (served by .NET Lambda)
    const defaultResource = this.api.root.addResource('generate-password');
    addGeneratePasswordMethods(defaultResource, dotnetIntegration, 'Default');

    // Explicit .NET route: /dotnet/generate-password
    const dotnetResource = this.api.root.addResource('dotnet').addResource('generate-password');
    addGeneratePasswordMethods(dotnetResource, dotnetIntegration, 'Dotnet');

    // Explicit Node.js route: /nodejs/generate-password
    const nodejsResource = this.api.root.addResource('nodejs').addResource('generate-password');
    addGeneratePasswordMethods(nodejsResource, nodejsIntegration, 'Nodejs');

    // 7. Stack Outputs
    new cdk.CfnOutput(this, 'ApiEndpointUrl', {
      value: this.api.url,
      description: 'Base URL of the Password Generator REST API',
      exportName: `${this.stackName}-ApiBaseUrl`,
    });

    new cdk.CfnOutput(this, 'GeneratePasswordEndpointUrl', {
      value: `${this.api.url}generate-password`,
      description: 'Default endpoint to generate passwords (.NET)',
      exportName: `${this.stackName}-GeneratePasswordUrl`,
    });

    new cdk.CfnOutput(this, 'DotnetGeneratePasswordEndpointUrl', {
      value: `${this.api.url}dotnet/generate-password`,
      description: 'Direct .NET endpoint to generate passwords',
      exportName: `${this.stackName}-DotnetGeneratePasswordUrl`,
    });

    new cdk.CfnOutput(this, 'NodejsGeneratePasswordEndpointUrl', {
      value: `${this.api.url}nodejs/generate-password`,
      description: 'Direct Node.js endpoint to generate passwords',
      exportName: `${this.stackName}-NodejsGeneratePasswordUrl`,
    });

    new cdk.CfnOutput(this, 'DotnetLambdaArn', {
      value: this.dotnetFunction.functionArn,
      description: 'ARN of the .NET Password Generator Lambda Function',
      exportName: `${this.stackName}-DotnetLambdaArn`,
    });

    new cdk.CfnOutput(this, 'NodejsLambdaArn', {
      value: this.nodejsFunction.functionArn,
      description: 'ARN of the Node.js Password Generator Lambda Function',
      exportName: `${this.stackName}-NodejsLambdaArn`,
    });
  }
}
