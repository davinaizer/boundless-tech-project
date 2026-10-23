import { describe, expect, it } from "vitest";
import type { DebugEntry } from "@/domain/api";
import { badgeOf, groupCalls, parseIfJson, summariseGroup, timingSplit } from "./debug-groups";
import type { EntryState } from "./debug-entries";
import type { ClientCall } from "./debug-log";

const call = (path: string, requestBody: unknown, ms = 10): ClientCall => ({
  path,
  requestBody,
  status: 200,
  ms,
  responseBody: {},
  requestId: `${path}-${ms}`,
});

const filters = {
  categories: ["days-out"],
  region: "South East",
  maxPricePerPerson: 30,
  keywords: [],
};
const submit = (query: string) => [
  call("/api/interpret", { query }, 2000),
  call("/api/search", { filters }, 30),
  call("/api/explain", { filters, offerIds: ["offer-001"] }, 3000),
];
const edit = (edited: object) => [
  call("/api/search", { filters: edited }, 40),
  call("/api/explain", { filters: edited, offerIds: [] }, 1000),
];
// The log keeps calls newest first.
const log = (...runs: ClientCall[][]) => runs.flat().reverse();

describe("parseIfJson", () => {
  it("returns a JSON object or array as a value", () => {
    expect(parseIfJson('{"filters":{"keywords":[]}}')).toEqual({ filters: { keywords: [] } });
    expect(parseIfJson("[1,2]")).toEqual([1, 2]);
  });

  it("keeps plain text, cut text and JSON scalars as text", () => {
    expect(parseIfJson("a cheap spa day")).toBe("a cheap spa day");
    expect(parseIfJson('{"filters":{"key…(cut)')).toBe('{"filters":{"key…(cut)');
    expect(parseIfJson("42")).toBe("42");
    expect(parseIfJson('"quoted"')).toBe('"quoted"');
  });
});

describe("groupCalls", () => {
  it("groups a submit under its query, oldest call first, with the total time", () => {
    expect(groupCalls(log(submit("spa in Bath")))).toEqual([
      { label: '"spa in Bath"', calls: submit("spa in Bath"), totalMs: 5030 },
    ]);
  });

  it("starts a new group for a chip edit, labelled by its filters, newest group first", () => {
    const edited = { categories: ["days-out"], audience: "family", keywords: ["zoo"] };
    const groups = groupCalls(log(submit("spa"), edit(edited)));
    expect(groups.map((g) => g.label)).toEqual(['Filters: days-out, family, "zoo"', '"spa"']);
    expect(groups[0]!.calls.map((c) => c.path)).toEqual(["/api/search", "/api/explain"]);
  });

  it("gives a link load (search and explain, no interpret) its own group", () => {
    const groups = groupCalls(log(edit(filters), edit({ keywords: [] })));
    expect(groups.map((g) => g.label)).toEqual([
      "Filters: none",
      "Filters: days-out, South East, £30 a head",
    ]);
  });

  it("labels a group whose start fell off the log", () => {
    const [, , explain] = submit("spa");
    const groups = groupCalls(log([explain!], submit("cinema")));
    expect(groups.map((g) => g.label)).toEqual(['"cinema"', "Earlier search (partly dropped)"]);
  });

  it("returns no groups for no calls", () => {
    expect(groupCalls([])).toEqual([]);
  });
});

const entry = (requestId: string, log: Record<string, unknown>, calls: DebugEntry["calls"] = []) =>
  ({ requestId, endpoint: "x", at: "", log, calls }) satisfies DebugEntry;
const modelCall = (ms: number) =>
  ({
    kind: "model",
    ms,
    prompt: "",
    ok: true,
    reply: "",
    inputTokens: 0,
    outputTokens: 0,
  }) as const;
const dataCall = (ms: number) =>
  ({ kind: "data", ms, method: "search", input: "", rows: 0 }) as const;

describe("summariseGroup", () => {
  const [group] = groupCalls(log(submit("spa")));
  const ids = group!.calls.map((c) => c.requestId!);
  const logs = [
    { modelCalls: 2, inputTokens: 300, outputTokens: 40, estimatedCostUsd: 0.00005 },
    { modelCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    { modelCalls: 1, inputTokens: 900, outputTokens: 400, estimatedCostUsd: 0.00029 },
  ];
  const all = new Map<string, EntryState>(ids.map((id, i) => [id, entry(id, logs[i]!)]));

  it("adds up model calls, tokens and cost from the log lines", () => {
    const summary = summariseGroup(group!, all);
    expect(summary).toMatchObject({ state: "known", modelCalls: 3, tokens: 1640 });
    expect(summary.state === "known" && summary.costUsd).toBeCloseTo(0.00034, 10);
  });

  it("is loading while a record has not arrived, never a partial total", () => {
    const some = new Map([...all].slice(0, 2));
    expect(summariseGroup(group!, some)).toEqual({ state: "loading" });
  });

  it("is unknown when a record is gone", () => {
    const gone = new Map(all).set(ids[2]!, "missing");
    expect(summariseGroup(group!, gone)).toEqual({ state: "unknown" });
  });

  it("skips a call that never got a request ID", () => {
    const noAnswer = { ...call("/api/interpret", { query: "spa" }), requestId: null };
    expect(summariseGroup({ label: "", calls: [noAnswer], totalMs: 0 }, new Map())).toEqual({
      state: "known",
      modelCalls: 0,
      tokens: 0,
      costUsd: 0,
    });
  });
});

describe("badgeOf", () => {
  it("names the fallback and its reason", () => {
    expect(badgeOf(entry("r", { source: "fallback", failure: "timeout" }))).toBe(
      "fallback · timeout",
    );
    expect(badgeOf(entry("r", { source: "fallback" }))).toBe("fallback");
    expect(
      badgeOf(
        entry("r", {
          source: "fallback",
          failure: "ungrounded",
          groundingRule: "number_or_symbol",
        }),
      ),
    ).toBe("fallback · ungrounded (number_or_symbol)");
  });

  it("flags a retry that recovered, and nothing for a plain answer or search", () => {
    expect(badgeOf(entry("r", { source: "llm", modelCalls: 2 }))).toBe("retried");
    expect(badgeOf(entry("r", { source: "llm", modelCalls: 1 }))).toBeUndefined();
    expect(badgeOf(entry("r", { modelCalls: 0 }))).toBeUndefined();
    expect(badgeOf("missing")).toBeUndefined();
    expect(badgeOf(undefined)).toBeUndefined();
  });
});

describe("timingSplit", () => {
  it("splits the browser's time into model, data, other server work and network", () => {
    const split = timingSplit(
      3100,
      entry("r", { latencyMs: 3000 }, [modelCall(2900), dataCall(40)]),
    );
    expect(split).toEqual({ modelMs: 2900, dataMs: 40, otherMs: 60, networkMs: 100 });
    expect(split.modelMs + split.dataMs + split.otherMs + split.networkMs).toBe(3100);
  });

  it("shows a part below zero as 0", () => {
    expect(timingSplit(90, entry("r", { latencyMs: 100 }, [modelCall(120)]))).toEqual({
      modelMs: 120,
      dataMs: 0,
      otherMs: 0,
      networkMs: 0,
    });
  });
});
