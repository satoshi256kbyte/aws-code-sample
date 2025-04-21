#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { GitlabStack } from '../lib/gitlab-stack';
import * as fs from 'fs';
import * as path from 'path';

const app = new cdk.App();

// パラメータファイルのパス
// デフォルトは../config/params.jsonだが、--paramsオプションで指定可能
const paramsPath = app.node.tryGetContext('params') || path.join(__dirname, '../config/params.json');

// パラメータファイルが存在するか確認
if (!fs.existsSync(paramsPath)) {
  throw new Error(`パラメータファイルが見つかりません: ${paramsPath}`);
}

// パラメータファイルの読み込み
console.log(`パラメータファイルを読み込み中: ${paramsPath}`);
const params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));

// パラメータを取得（JSONファイルとCDKコンテキストの両方をサポート）
const getParam = (key: string, defaultValue?: string): string => {
  // CDKコンテキストを優先（コマンドラインからの上書きを許可）
  const contextValue = app.node.tryGetContext(key);
  if (contextValue !== undefined) {
    return contextValue;
  }
  
  // 次にJSONファイルの値を使用
  if (params[key] !== undefined && params[key] !== '') {
    return params[key];
  }
  
  // 最後にデフォルト値を使用
  return defaultValue || '';
};

// 各パラメータを取得
const vpcId = getParam('vpcId');
const subnetId = getParam('subnetId');
const securityGroupId = getParam('securityGroupId');
const instanceTypeStr = getParam('instanceType', 't3.large');
const amiId = getParam('amiId');
const cognitoClientId = getParam('cognitoClientId');
const cognitoClientSecret = getParam('cognitoClientSecret');
const cognitoDomain = getParam('cognitoDomain');
const cognitoRegion = getParam('cognitoRegion', 'ap-northeast-1');

// 環境設定
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || getParam('account'),
  region: process.env.CDK_DEFAULT_REGION || getParam('region', 'ap-northeast-1')
};

// パラメータの検証
if (!vpcId || !subnetId || !securityGroupId || !cognitoClientId || !cognitoClientSecret || !cognitoDomain) {
  throw new Error(`
    以下のパラメータが必要です:
    * vpcId: VPC ID
    * subnetId: サブネットID
    * securityGroupId: セキュリティグループID
    * amiId: AMI ID
    * cognitoClientId: Cognito クライアントID
    * cognitoClientSecret: Cognito クライアントシークレット
    * cognitoDomain: Cognito ドメイン名

    オプションパラメータ:
    * instanceType: インスタンスタイプ (デフォルト: t3.large)
    * cognitoRegion: Cognito リージョン (デフォルト: ap-northeast-1)
    * region: デプロイリージョン (デフォルト: ap-northeast-1)
    * account: AWSアカウントID

    例:
    cdk deploy -c vpcId=vpc-xxxxxxxx -c subnetId=subnet-xxxxxxxx -c securityGroupId=sg-xxxxxxxx -c amiId=ami-xxxxxxxx -c cognitoClientId=xxxxxxxx -c cognitoClientSecret=xxxxxxxx -c cognitoDomain=mydomain -c cognitoRegion=ap-northeast-1
  `);
}

// 既存のリソースを参照
const vpc = ec2.Vpc.fromLookup(app, 'ImportedVpc', { vpcId });
const subnet = ec2.Subnet.fromSubnetId(app, 'ImportedSubnet', subnetId);
const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(app, 'ImportedSecurityGroup', securityGroupId);
const instanceType = new ec2.InstanceType(instanceTypeStr);

// AMIの設定: 指定がなければAmazon Linuxの最新版を使用
let machineImage: ec2.IMachineImage;
if (amiId) {
  machineImage = ec2.MachineImage.genericLinux({
    [env.region]: amiId
  });
} else {
  machineImage = new ec2.AmazonLinuxImage({
    generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    edition: ec2.AmazonLinuxEdition.STANDARD,
    virtualization: ec2.AmazonLinuxVirt.HVM,
    storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    cpuType: ec2.AmazonLinuxCpuType.X86_64,
  });
}

// GitLabスタックを作成
new GitlabStack(app, 'GitlabStack', {
  env,
  vpc,
  subnet,
  securityGroup,
  instanceType,
  machineImage,
  cognitoClientId,
  cognitoClientSecret,
  cognitoDomain,
  cognitoRegion,
  description: 'GitLab Enterprise Edition with Amazon Cognito authentication'
});
