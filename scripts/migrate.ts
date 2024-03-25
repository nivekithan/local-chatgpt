import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { Resource } from "sst";

const sql = postgres(Resource.PostgresConnectionUrl.value, {
  max: 1,
  ssl: "require",
});
const db = drizzle(sql);
await migrate(db, { migrationsFolder: "migrations" });
await sql.end();
