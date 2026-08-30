import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PasswordGeneratorStack } from './password-generator-stack';

export interface PasswordGeneratorAppStageProps extends cdk.StageProps {}

export class PasswordGeneratorAppStage extends cdk.Stage {
  public readonly passwordGeneratorStack: PasswordGeneratorStack;

  constructor(scope: Construct, id: string, props?: PasswordGeneratorAppStageProps) {
    super(scope, id, props);

    this.passwordGeneratorStack = new PasswordGeneratorStack(this, 'PasswordGeneratorStack', {
      description: 'Serverless Password Generator Lambda and API Gateway Stack (Deployed via Pipeline)',
    });
  }
}
