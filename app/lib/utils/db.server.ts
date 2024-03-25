import { PostgresJsQueryResultHKT, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";

const sql = postgres(Resource.PostgresConnectionUrl.value, {
  ssl: "require",
});

export const db = drizzle(sql);
export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;
