import { z } from "zod";

// The only reader of process.env (ADR-009 rule 6). Phase 1 extends this schema.
// NEXT_PUBLIC_ values are inlined at build time, so each is read as a literal
// property access, never destructured or looked up dynamically.
const schema = z.object({
  NEXT_PUBLIC_APP_VERSION: z.string().min(1),
});

export const env = schema.parse({
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
});
