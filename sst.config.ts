/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "local-chatgpt",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "ap-south-1",
          profile: "dev",
        },
      },
    };
  },
  async run() {
    const postgresConnectionUrl = new sst.Secret("PostgresConnectionUrl");
    const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");
    const localChatGptKey = new sst.Secret("LocalChatGptKey");
    const oauthGoogleClientId = new sst.Secret("OAuthGoogleClientId");
    const oauthGoogleClientSecret = new sst.Secret("OAuthGoogleClientSecret");
    const oauthRedirectUri = new sst.Secret("OAuthRedirectUri");
    const sessionSecret = new sst.Secret("SessionSecret");

    new sst.aws.Remix("LocalChatGPT", {
      // domain: $app.stage === "prod" ? "chat.nivekithan.com" : undefined,
      link: [
        postgresConnectionUrl,
        replicacheLicenseKey,
        localChatGptKey,
        oauthGoogleClientSecret,
        oauthGoogleClientId,
        oauthRedirectUri,
        sessionSecret,
      ],
    });
  },
});
