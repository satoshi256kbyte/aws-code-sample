# GitLab + Amazon Cognito認証

## 設計

以下の内容をAWS CDKを使用して実装する

- Amazon EC2でGitLabをホスト
- GitLabはEE（Enterprise Edition）を使用
- Amazon Cognitoを使用して認証を行う
- EC2を起動するのに必要なVPC、サブネット、セキュリティグループ、AMIはCDKへの引数として渡す
- IAMロールとEIPはCDKを使用して作成
- GitLabの設定に必要な、クライアントID、クライアントシークレット、ドメイン名は、CDKの引数として渡す

## GitLabの設定

こちらを参考にして、GitLabの設定を行います。
https://gitlab-docs.creationline.com/ee/administration/auth/cognito.html

以下、抜粋です

```
共通設定を構成して、シングルサインオンプロバイダとしてcognito 。これにより、既存のGitLabアカウントを持っていないユーザーのためのJust-In-Timeアカウントプロビジョニングが可能になります。
GitLabサーバーで、設定ファイルを開きます。Linuxパッケージインストールの場合：

sudo editor /etc/gitlab/gitlab.rb

以下のコードブロックで、AWS Cognitoアプリケーションの情報を以下のパラメータに入力します：

app_id:クライアント ID。
app_secret:クライアントのシークレット
site:アマゾンのドメインとリージョン
/etc/gitlab/gitlab.rb ファイルにコードブロックを含めます：

gitlab_rails['omniauth_allow_single_sign_on'] = ['cognito']
gitlab_rails['omniauth_providers'] = [
  {
    name: "cognito",
    label: "Provider name", # optional label for login button, defaults to "Cognito"
    icon: nil,   # Optional icon URL
    app_id: "<client_id>",
    app_secret: "<client_secret>",
    args: {
      scope: "openid profile email",
      client_options: {
        site: "https://<your_domain>.auth.<your_region>.amazoncognito.com",
        authorize_url: "/oauth2/authorize",
        token_url: "/oauth2/token",
        user_info_url: "/oauth2/userInfo"
      },
      user_response_structure: {
        root_path: [],
        id_path: ["sub"],
        attributes: { nickname: "email", name: "email", email: "email" }
      },
      name: "cognito",
      strategy_class: "OmniAuth::Strategies::OAuth2Generic"
    }
  }
]

設定ファイルを保存します。
ファイルを保存し、変更を有効にするために GitLab を再設定します。
```