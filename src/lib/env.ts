import "server-only";
import { z } from "zod";

// The only reader of process.env (ADR-009 rule 6). Server-only: DATABASE_URL
// and ANTHROPIC_API_KEY carry credentials, so a Client Component must not import this module.
const unsetIfEmpty = (value: unknown) => (value === "" ? undefined : value);

const schema = z
  .object({
    // Inlined at build time (next.config.ts), so it is read below as a literal
    // `process.env.NEXT_PUBLIC_*` property access, never destructured or computed.
    NEXT_PUBLIC_APP_VERSION: z.string().min(1),
    // Postgres when set, the in-memory adapter when unset or empty (ADR-010).
    DATABASE_URL: z.preprocess(unsetIfEmpty, z.url({ protocol: /^postgres(ql)?$/ }).optional()),
    // The mock by default, so the app, CI and e2e run without a key (ADR-007).
    AI_PROVIDER: z.preprocess(unsetIfEmpty, z.enum(["anthropic", "mock"]).default("mock")),
    ANTHROPIC_API_KEY: z.preprocess(unsetIfEmpty, z.string().min(1).optional()),
    // Abort a model call after this many milliseconds. 8000 is a heuristic (one
    // live check took 2 to 3 s), to be tuned from logged latency. Capped at 60 s:
    // longer is no use to an interactive request, and Node turns a timer above
    // 2^31 - 1 ms into 1 ms, which would time out every call.
    AI_TIMEOUT_MS: z.preprocess(
      unsetIfEmpty,
      z.coerce.number().int().positive().max(60_000).default(8000),
    ),
    // Request limits (ADR-006). Heuristics: 200 characters is the ADR's starting
    // value; 4096 bytes leaves room for a full filters object or ten offer IDs.
    MAX_QUERY_CHARS: z.preprocess(
      unsetIfEmpty,
      z.coerce.number().int().positive().max(1000).default(200),
    ),
    MAX_BODY_BYTES: z.preprocess(
      unsetIfEmpty,
      z.coerce.number().int().positive().max(65_536).default(4096),
    ),
  })
  .refine((value) => value.AI_PROVIDER !== "anthropic" || value.ANTHROPIC_API_KEY !== undefined, {
    message: "ANTHROPIC_API_KEY is required when AI_PROVIDER is anthropic",
    path: ["ANTHROPIC_API_KEY"],
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

export const env = parseEnv({
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  DATABASE_URL: process.env.DATABASE_URL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS,
  MAX_QUERY_CHARS: process.env.MAX_QUERY_CHARS,
  MAX_BODY_BYTES: process.env.MAX_BODY_BYTES,
});
