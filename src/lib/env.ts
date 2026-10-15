import "server-only";
import { z } from "zod";

// The only reader of process.env (ADR-009 rule 6). Server-only: DATABASE_URL
// carries credentials, so a Client Component must not import this module.
const schema = z.object({
  // Inlined at build time (next.config.ts), so it is read below as a literal
  // `process.env.NEXT_PUBLIC_*` property access, never destructured or computed.
  NEXT_PUBLIC_APP_VERSION: z.string().min(1),
  // Postgres when set, the in-memory adapter when unset or empty (ADR-010).
  DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  ),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

export const env = parseEnv({
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  DATABASE_URL: process.env.DATABASE_URL,
});
