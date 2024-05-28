import { defineConfig } from "drizzle-kit";
import { Resource } from "sst/resource";

export default defineConfig({
  schema: "./app/lib/utils/schema.server.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: `${Resource.PostgresConnectionUrl.value}?sslmode=require`,
  },
  out: "migrations",
  strict: true,
});
