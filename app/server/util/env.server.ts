import { AppLoadContext } from "@remix-run/cloudflare";
import { z } from "zod";

export const EnvVariableSchema = z.object({
  OPENAI_API_KEY: z.string(),
  REPLICACHE_LICENSE_KEY: z.string(),
  DB: z.custom<D1Database>((value) => value !== null && value !== undefined),
});

export function getEnv(context: AppLoadContext) {
  return EnvVariableSchema.parse(context.cloudflare.env);
}
