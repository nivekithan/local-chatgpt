import { defineConfig } from "drizzle-kit";
import { Resource } from "sst/resource";

export default defineConfig({
  schema: "./app/lib/utils/schema.server.ts",
  driver: "pg",
  dbCredentials: {
    connectionString: Resource.PostgresConnectionUrl.value,
  },
  out: "migrations",
  strict: true,
});
