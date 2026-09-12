import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PasswordGeneratorStack } from '../lib/password-generator-stack';

describe('PasswordGeneratorStack CDK Assertions', () => {
  let app: cdk.App;
  let stack: PasswordGeneratorStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new PasswordGeneratorStack(app, 'TestPasswordGeneratorStack');
    template = Template.fromStack(stack);
  });

  test('synthesizes Lambda Function with Node.js runtime and ARM64 architecture', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs24.x',
      Architectures: ['arm64'],
      Handler: 'index.handler',
      MemorySize: 256,
      Timeout: 10,
    });
  });

  test('synthesizes Lambda Function with .NET 10 custom runtime (provided.al2023) and ARM64 architecture', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'provided.al2023',
      Architectures: ['arm64'],
      Handler: 'bootstrap',
      MemorySize: 256,
      Timeout: 10,
    });
  });

  test('synthesizes LogGroups with retention of 7 days', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 7,
    });
  });

  test('synthesizes API Gateway REST API with prod stage and resources', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Password Generator Service',
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'generate-password',
    });

    // Check POST method existence on default /generate-password
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      OperationName: 'DefaultGeneratePasswordPost',
      Integration: {
        Type: 'AWS_PROXY',
      },
    });

    // Check GET method existence on default /generate-password
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'GET',
      OperationName: 'DefaultGeneratePasswordGet',
      Integration: {
        Type: 'AWS_PROXY',
      },
    });

    // Check Dotnet POST method
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      OperationName: 'DotnetGeneratePasswordPost',
    });

    // Check Nodejs POST method
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      OperationName: 'NodejsGeneratePasswordPost',
    });
  });

  test('defines stack outputs for API Endpoints and Lambda ARNs', () => {
    template.hasOutput('ApiEndpointUrl', {
      Export: {
        Name: 'TestPasswordGeneratorStack-ApiBaseUrl',
      },
    });

    template.hasOutput('GeneratePasswordEndpointUrl', {
      Export: {
        Name: 'TestPasswordGeneratorStack-GeneratePasswordUrl',
      },
    });

    template.hasOutput('DotnetGeneratePasswordEndpointUrl', {
      Export: {
        Name: 'TestPasswordGeneratorStack-DotnetGeneratePasswordUrl',
      },
    });

    template.hasOutput('NodejsGeneratePasswordEndpointUrl', {
      Export: {
        Name: 'TestPasswordGeneratorStack-NodejsGeneratePasswordUrl',
      },
    });

    template.hasOutput('DotnetLambdaArn', {
      Export: {
        Name: 'TestPasswordGeneratorStack-DotnetLambdaArn',
      },
    });

    template.hasOutput('NodejsLambdaArn', {
      Export: {
        Name: 'TestPasswordGeneratorStack-NodejsLambdaArn',
      },
    });
  });
});
