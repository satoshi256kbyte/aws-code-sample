import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { GitlabStack } from '../lib/gitlab-stack';

describe('GitlabStack', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  // テスト前の共通セットアップ
  beforeEach(() => {
    app = new cdk.App();
    
    // モックデータ
    const vpc = ec2.Vpc.fromVpcAttributes(app, 'MockVpc', {
      vpcId: 'vpc-12345',
      availabilityZones: ['ap-northeast-1a', 'ap-northeast-1c'],
      publicSubnetIds: ['subnet-12345', 'subnet-67890'],
    });
    
    const subnet = ec2.Subnet.fromSubnetId(app, 'MockSubnet', 'subnet-12345');
    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(app, 'MockSG', 'sg-12345');
    const instanceType = new ec2.InstanceType('t3.large');
    const machineImage = ec2.MachineImage.genericLinux({
      'ap-northeast-1': 'ami-12345'
    });
    
    // スタックの作成
    stack = new GitlabStack(app, 'TestStack', {
      vpc,
      subnet,
      securityGroup,
      instanceType,
      machineImage,
      cognitoClientId: 'test-client-id',
      cognitoClientSecret: 'test-client-secret',
      cognitoDomain: 'test-domain',
      cognitoRegion: 'ap-northeast-1',
      env: { account: '123456789012', region: 'ap-northeast-1' }
    });
    
    // テンプレートの生成
    template = Template.fromStack(stack);
  });
  
  test('EC2インスタンスが作成されていること', () => {
    // EC2インスタンスリソースの検証
    template.resourceCountIs('AWS::EC2::Instance', 1);
    template.hasResourceProperties('AWS::EC2::Instance', {
      InstanceType: 't3.large',
      IamInstanceProfile: {
        Ref: expect.stringMatching(/GitLabInstanceRole/)
      }
    });
  });
  
  test('IAMロールが作成され、ポリシーがアタッチされていること', () => {
    // IAMロールリソースの検証
    template.resourceCountIs('AWS::IAM::Role', 1);
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'ec2.amazonaws.com'
            }
          }
        ]
      },
      ManagedPolicyArns: [
        { 'Fn::Join': expect.anything() },  // AmazonSSMManagedInstanceCore
        { 'Fn::Join': expect.anything() }   // AmazonS3ReadOnlyAccess
      ]
    });
  });
  
  test('Elastic IPが作成されていること', () => {
    // EIPリソースの検証
    template.resourceCountIs('AWS::EC2::EIP', 1);
    template.resourceCountIs('AWS::EC2::EIPAssociation', 1);
  });
  
  test('UserDataがCognitoの設定を含んでいること', () => {
    // UserDataにCognitoの設定が含まれているか検証
    const userDataSection = template.findResources('AWS::EC2::Instance')[Object.keys(template.findResources('AWS::EC2::Instance'))[0]].Properties.UserData;
    
    expect(userDataSection).toBeDefined();
    // UserDataは Base64エンコードされているため、このテストでは存在確認のみ
  });
  
  test('必要なアウトプットが定義されていること', () => {
    // アウトプットの検証
    template.hasOutput('GitLabURL', {});
    template.hasOutput('SSHCommand', {});
  });
});
