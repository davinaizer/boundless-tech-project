import { describe, expect, it } from "vitest";
import { groupCalls, parseIfJson } from "./debug-groups";
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
