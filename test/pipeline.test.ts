import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PasswordGeneratorPipelineStack } from '../lib/pipeline-stack';

describe('PasswordGeneratorPipelineStack CDK Assertions', () => {
  let app: cdk.App;
  let stack: PasswordGeneratorPipelineStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new PasswordGeneratorPipelineStack(app, 'TestPipelineStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      connectionArn: 'arn:aws:codeconnections:us-east-1:123456789012:connection/test-conn',
    });
    template = Template.fromStack(stack);
  });

  test('synthesizes AWS CodePipeline resource with correct name', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'PasswordGenerator-ContinuousDelivery',
    });
  });

  test('synthesizes CodeBuild Project for Synth and Test step', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Environment: {
        ComputeType: 'BUILD_GENERAL1_SMALL',
        Image: 'aws/codebuild/standard:7.0',
        Type: 'LINUX_CONTAINER',
      },
    });
  });
});
