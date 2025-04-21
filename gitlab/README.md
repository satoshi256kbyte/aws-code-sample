# GitLab + Amazon Cognito認証 AWS CDKプロジェクト

このプロジェクトは、AWS CDKを使用してGitLab Enterprise Editionをデプロイし、Amazon Cognitoによるシングルサインオン認証を設定するためのものです。

## 概要

このCDKスタックは以下のリソースをデプロイします：

- GitLab EEを実行するAmazon EC2インスタンス
- EC2インスタンスに関連付けられるElastic IP
- GitLabのインスタンスプロファイル用IAMロール
- Amazon Cognitoとの連携設定

## 前提条件

1. AWS CDKがインストールされていること
2. TypeScriptの開発環境が整っていること
3. AWSアカウントへのアクセス権限があること
4. 以下の既存リソースが利用可能であること：
   - VPC
   - サブネット
   - セキュリティグループ
   - GitLabを実行するためのAMI（オプション）
5. Amazon Cognitoユーザープールが設定済みであること：
   - アプリケーションクライアントが作成済みであること
   - コールバックURLが設定されていること（例：`https://gitlab.example.com/users/auth/cognito/callback`）

## デプロイ方法

### パラメータの設定

パラメータはJSONファイルで管理されています。デプロイ前に、サンプルファイルから実際のパラメータファイルを作成してください：

1. サンプルファイルから`params.json`を作成：

```bash
cp config/params.json.sample config/params.json
```

2. `config/params.json`ファイルを編集して適切な値を設定：

```json
{
    "vpcId": "vpc-xxxxxxxx",
    "subnetId": "subnet-xxxxxxxx",
    "securityGroupId": "sg-xxxxxxxx",
    "cognitoClientId": "xxxxxxxxxxxxxxx",
    "cognitoClientSecret": "xxxxxxxxxxxxxxx",
    "cognitoDomain": "your-cognito-domain",
    "cognitoRegion": "ap-northeast-1",
    "instanceType": "t3.large",
    "amiId": "",
    "region": "ap-northeast-1",
    "account": ""
}
```

> **注意**: `params.json`ファイルは機密情報を含むため、Gitの管理対象外となっています。
> チームで作業する場合は、各開発者がサンプルファイルをコピーして自分の環境用のパラメータを設定してください。

### デプロイ手順

1. 必要なパッケージをインストール：

```bash
npm install
```

2. TypeScriptをコンパイル：

```bash
npm run build
```

3. CDKスタックをデプロイ：

```bash
npx cdk deploy
```

異なるパラメータファイルを使用したい場合は、以下のようにパスを指定できます：

```bash
npx cdk deploy -c params=./path/to/custom-params.json
```

コマンドラインから一部のパラメータを上書きすることもできます（JSONファイルの設定より優先されます）：

```bash
npx cdk deploy -c vpcId=vpc-yyyyyyyy -c cognitoDomain=another-domain
```

## 必須パラメータ

| パラメータ | 説明 |
|------------|------|
| vpcId | GitLabインスタンスをデプロイするVPC ID |
| subnetId | GitLabインスタンスをデプロイするサブネットID |
| securityGroupId | GitLabインスタンスに関連付けるセキュリティグループID |
| cognitoClientId | Amazon CognitoアプリケーションクライアントID |
| cognitoClientSecret | Amazon Cognitoアプリケーションクライアントシークレット |
| cognitoDomain | Amazon Cognitoドメイン名 |

## オプションパラメータ

| パラメータ | 説明 | デフォルト値 |
|------------|------|-------------|
| amiId | GitLabをインストールするAMI ID | Amazon Linux 2 最新版 |
| instanceType | EC2インスタンスタイプ | t3.large |
| cognitoRegion | Amazon Cognitoのリージョン | ap-northeast-1 |
| region | デプロイするAWSリージョン | ap-northeast-1 |
| account | デプロイするAWSアカウントID | 現在のCLI設定 |

## デプロイ後の設定

デプロイが完了すると、以下の情報がCloudFormationスタックの出力に表示されます：

- GitLabのURL: `http://{Elastic IP}`
- SSHコマンド: `ssh ubuntu@{Elastic IP}`

GitLabの初回アクセス時に、rootユーザーのパスワードを設定する必要があります。その後、管理コンソールから以下の設定を確認してください：

1. 管理エリア > 設定 > サインイン制限 で、以下を確認：
   - 「Restrict sign-in to verified accounts only」が無効になっていること
   - 「Sign-up enabled」が有効になっていること（Cognitoユーザーの自動プロビジョニングのため）

2. 管理エリア > 設定 > ネットワーク > Outbound requests で、以下を確認：
   - 「Allow requests to the local network from webhooks and integrations」が有効になっていること

## DNSとSSL/TLS設定

本番環境では、Elastic IPに対して適切なDNSレコードを設定し、SSL/TLS証明書を設定することを強く推奨します。

## 役立つコマンド

* `npm run build`   TypeScriptコードをコンパイル
* `npm run watch`   変更を監視してコンパイル
* `npm run test`    Jestによるユニットテストを実行
* `npx cdk deploy`  スタックをデフォルトのAWSアカウント/リージョンにデプロイ
* `npx cdk diff`    デプロイされたスタックと現在の状態を比較
* `npx cdk synth`   合成されたCloudFormationテンプレートを出力
