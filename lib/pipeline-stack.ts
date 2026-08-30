import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { PasswordGeneratorAppStage } from './pipeline-stage';

export interface PasswordGeneratorPipelineStackProps extends cdk.StackProps {
  /**
   * GitHub repository owner and name in the format 'owner/repo'.
   * @default 'bicky123/Password-Generator'
   */
  githubRepo?: string;

  /**
   * GitHub branch to monitor for changes.
   * @default 'main'
   */
  githubBranch?: string;

  /**
   * AWS CodeConnections / CodeStar Connection ARN for GitHub authentication.
   * If not specified, the pipeline will look for a GitHub personal access token in Secrets Manager.
   */
  connectionArn?: string;

  /**
   * Secrets Manager secret name containing GitHub Personal Access Token (if not using Connection ARN).
   * @default 'github-token'
   */
  githubTokenSecretName?: string;
}

export class PasswordGeneratorPipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;

  constructor(scope: Construct, id: string, props?: PasswordGeneratorPipelineStackProps) {
    super(scope, id, props);

    const githubRepo = props?.githubRepo ?? this.node.tryGetContext('githubRepo') ?? 'bicky123/Password-Generator';
    const githubBranch = props?.githubBranch ?? this.node.tryGetContext('githubBranch') ?? 'main';
    const connectionArn =
      props?.connectionArn ??
      this.node.tryGetContext('connectionArn') ??
      process.env.CODESTAR_CONNECTION_ARN;
    const githubTokenSecretName =
      props?.githubTokenSecretName ??
      this.node.tryGetContext('githubTokenSecretName') ??
      'github-token';

    // 1. Configure GitHub Source
    let source: pipelines.CodePipelineSource;

    if (connectionArn && connectionArn.trim().length > 0) {
      // Use AWS CodeStar / CodeConnections Connection (Recommended modern AWS standard)
      source = pipelines.CodePipelineSource.connection(githubRepo, githubBranch, {
        connectionArn,
      });
    } else {
      // Use GitHub Personal Access Token stored in AWS Secrets Manager
      source = pipelines.CodePipelineSource.gitHub(githubRepo, githubBranch, {
        authentication: cdk.SecretValue.secretsManager(githubTokenSecretName),
      });
    }

    // 2. Define CDK Pipeline with Self-Mutation and Synth step
    this.pipeline = new pipelines.CodePipeline(this, 'PasswordGeneratorPipeline', {
      pipelineName: 'PasswordGenerator-ContinuousDelivery',
      synth: new pipelines.CodeBuildStep('Synth', {
        input: source,
        installCommands: ['npm ci'],
        commands: [
          'npm run build',
          'npm test',
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'cdk.out',
      }),
      selfMutation: true,
      dockerEnabledForSynth: false,
    });

    // 3. Add Application Deployment Stage
    const deployStage = new PasswordGeneratorAppStage(this, 'Prod', {
      env: {
        account: props?.env?.account ?? process.env.CDK_DEFAULT_ACCOUNT,
        region: props?.env?.region ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
      },
    });

    this.pipeline.addStage(deployStage);
  }
}
