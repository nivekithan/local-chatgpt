import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { Resource } from "sst";

const client = new Client({
  connectionString: Resource.PostgresConnectionUrl.value,
});

await client.connect();
export const db = drizzle(client);
