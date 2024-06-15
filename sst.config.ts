// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "local-chatgpt",
      removal: input?.stage === "prod" ? "retain" : "remove",
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
    const oauthGoogleClientId = new sst.Secret("OAuthGoogleClientId");
    const oauthGoogleClientSecret = new sst.Secret("OAuthGoogleClientSecret");
    const oauthRedirectUri = new sst.Secret("OAuthRedirectUri");
    const sessionSecret = new sst.Secret("SessionSecret");

    new sst.aws.Remix("LocalChatGPT", {
      domain:
        $app.stage === "prod"
          ? {
              name: "chat.nivekithan.com",
              dns: false,
              cert: "arn:aws:acm:us-east-1:100519828617:certificate/4faa2031-359e-4168-9c4c-556c72ce9b48",
            }
          : undefined,
      link: [
        postgresConnectionUrl,
        replicacheLicenseKey,
        oauthGoogleClientSecret,
        oauthGoogleClientId,
        oauthRedirectUri,
        sessionSecret,
      ],
    });
  },
});
