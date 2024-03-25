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

    new sst.aws.Remix("LocalChatGPT", { link: [postgresConnectionUrl] });
  },
});
