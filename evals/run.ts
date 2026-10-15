import { EVAL_CASES } from "./cases";
import { scoreBaseline, scoreCase } from "./score";

// On-demand eval of the interpret step against the real model (ADR-007). Run
// with `pnpm eval`; it costs a few cents at most and is never run in CI. It
// prints a Markdown report to stdout. Each case runs once, so the pass rate is
// one sample, not a measure of accuracy on real queries.
//
// It cannot avoid src/lib/env.ts (the services import it), so the pnpm script
// sets NEXT_PUBLIC_APP_VERSION. The services are imported after the checks
// below, so a missing key is reported plainly instead of as a parse error from
// env.ts. The result of each notable run is recorded in docs/eval-results.md
// with the prompt version that produced it.

// The catalogue's reference date, so "found offers" does not drift as offers expire.
const TODAY = "2026-10-15";

type Row = {
  id: string;
  query: string;
  pass: boolean;
  note: string;
  baseline: boolean;
  source: "llm" | "fallback";
  offers: number;
  ms: number;
  inputTokens: number;
  outputTokens: number;
};

async function main(): Promise<void> {
  if (process.env.AI_PROVIDER !== "anthropic") {
    throw new Error(
      "The eval needs the real model: set AI_PROVIDER=anthropic and a key (use `pnpm eval`).",
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set: put it in .env.local or the shell.");
  }
  const { MODEL } = await import("@/lib/ai/client");
  const { findOffers } = await import("@/services/find-offers");
  const { interpretQuery, keywordFallback } = await import("@/services/interpret-query");
  const { PROMPT_VERSION } = await import("@/services/prompt-version");

  const baselines = new Map(
    scoreBaseline(EVAL_CASES, keywordFallback).map(({ id, verdict }) => [id, verdict.pass]),
  );
  const rows: Row[] = [];
  for (const { id, query, expect } of EVAL_CASES) {
    const start = Date.now();
    const result = await interpretQuery(query);
    const ms = Date.now() - start;
    const verdict = scoreCase(expect, result.filters);
    const offers = await findOffers(result.filters, TODAY);
    const fallbackNote = result.source === "fallback" ? "model gave no usable filters; " : "";
    rows.push({
      id,
      query,
      pass: verdict.pass,
      note: fallbackNote + (verdict.pass ? "" : verdict.reasons.join("; ")),
      baseline: baselines.get(id) === true,
      source: result.source,
      offers: offers.length,
      ms,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });
  }

  const passed = rows.filter((row) => row.pass).length;
  const baselinePassed = rows.filter((row) => row.baseline).length;
  const fallbacks = rows.filter((row) => row.source === "fallback").length;
  const found = rows.filter((row) => row.offers > 0).length;
  const slowest = rows.reduce((a, b) => (b.ms > a.ms ? b : a));
  const sum = (key: "inputTokens" | "outputTokens") => rows.reduce((n, row) => n + row[key], 0);

  const cell = (text: string) => text.replaceAll("|", "\\|");
  const lines = [
    `# Eval run ${new Date().toISOString().slice(0, 10)}`,
    "",
    `- Prompt version: \`${PROMPT_VERSION}\``,
    `- Model: \`${MODEL}\``,
    `- Catalogue date for result counts: ${TODAY}`,
    `- **Parse pass rate: ${passed}/${rows.length}**`,
    `- Keywords-only baseline (\`keywordFallback\`, no model): ${baselinePassed}/${rows.length}`,
    `- Cases that used the keyword fallback: ${fallbacks}`,
    `- Cases whose filters found at least one offer: ${found}/${rows.length}`,
    `- Tokens: ${sum("inputTokens")} in, ${sum("outputTokens")} out`,
    `- Slowest case: ${slowest.id}, ${slowest.ms} ms`,
    "",
    "| Case | Result | Keywords only | Offers | Note |",
    "|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.id} | ${row.pass ? "pass" : "FAIL"} | ${row.baseline ? "pass" : "FAIL"} | ${row.offers} | ${cell(row.note)} |`,
    ),
  ];
  console.log(lines.join("\n"));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
