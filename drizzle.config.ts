import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/server/util/db.server.ts",
  driver: "d1",
  dbCredentials: {
    dbName: "local-chatgpt",
    wranglerConfigPath: "./wrangler.toml",
  },
  strict: true,
  out: "drizzle",
});
