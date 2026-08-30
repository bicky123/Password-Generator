#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PasswordGeneratorStack } from '../lib/password-generator-stack';
import { PasswordGeneratorPipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// 1. Standalone Application Stack (Direct CDK Deployment)
new PasswordGeneratorStack(app, 'PasswordGeneratorStack', {
  env,
  description: 'AWS CDK Stack for Serverless Password Generator API',
  tags: {
    Project: 'PasswordGenerator',
    ManagedBy: 'AWS-CDK',
  },
});

// 2. Continuous Delivery Pipeline Stack (AWS CodePipeline via CDK Pipelines)
new PasswordGeneratorPipelineStack(app, 'PasswordGeneratorPipelineStack', {
  env,
  description: 'AWS CodePipeline CI/CD Stack for Serverless Password Generator',
  tags: {
    Project: 'PasswordGenerator',
    ManagedBy: 'AWS-CDK-Pipelines',
  },
});
