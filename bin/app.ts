#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PasswordGeneratorStack } from '../lib/password-generator-stack';

const app = new cdk.App();

new PasswordGeneratorStack(app, 'PasswordGeneratorStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },

  description: 'AWS CDK Stack for Serverless Password Generator API',
  tags: {
    Project: 'PasswordGenerator',
    ManagedBy: 'AWS-CDK',
  },
});
