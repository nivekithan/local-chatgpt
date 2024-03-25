/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "local-chatgpt",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const postgresConnectionUrl = new sst.Secret("PostgresConnectionUrl");
    const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");
    const localChatGptKey = new sst.Secret("LocalChatGptKey");

    new sst.aws.Remix("LocalChatGPT", {
      link: [postgresConnectionUrl, replicacheLicenseKey, localChatGptKey],
    });
  },
});
