import { AppLoadContext } from "@remix-run/cloudflare";
import { z } from "zod";

export const EnvVariableSchema = z.object({
  OPENAI_API_KEY: z.string(),
  REPLICACHE_LICENSE_KEY: z.string(),
});

export function getEnv(context: AppLoadContext) {
  return EnvVariableSchema.parse(context.cloudflare.env);
}
