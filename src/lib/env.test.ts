import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const version = { NEXT_PUBLIC_APP_VERSION: "v0.1.0+1.abc1234" };

describe("parseEnv", () => {
  it("treats an unset DATABASE_URL as undefined", () => {
    expect(parseEnv({ ...version }).DATABASE_URL).toBeUndefined();
  });

  it("treats an empty DATABASE_URL as undefined", () => {
    expect(parseEnv({ ...version, DATABASE_URL: "" }).DATABASE_URL).toBeUndefined();
  });

  it("accepts postgres:// and postgresql:// URLs", () => {
    for (const url of ["postgres://u:p@127.0.0.1:5432/db", "postgresql://u:p@127.0.0.1:5432/db"]) {
      expect(parseEnv({ ...version, DATABASE_URL: url }).DATABASE_URL).toBe(url);
    }
  });

  it("rejects other schemes and non-URLs", () => {
    for (const url of ["http://example.com/db", "not a url"]) {
      expect(() => parseEnv({ ...version, DATABASE_URL: url })).toThrow();
    }
  });

  it("fails when the app version is missing", () => {
    expect(() => parseEnv({})).toThrow();
  });

  it("does not put the credentials in the error message", () => {
    const secret = "hunter2-sentinel";
    let message = "";
    try {
      parseEnv({ ...version, DATABASE_URL: `mysql://user:${secret}@host/db` });
    } catch (error) {
      message = String(error);
    }
    expect(message).not.toBe("");
    expect(message).not.toContain(secret);
  });

  it("defaults NODE_ENV to production when unset or empty, so a gate on development fails closed", () => {
    expect(parseEnv({ ...version }).NODE_ENV).toBe("production");
    expect(parseEnv({ ...version, NODE_ENV: "" }).NODE_ENV).toBe("production");
  });

  it("accepts the three NODE_ENV values and rejects others", () => {
    for (const value of ["development", "production", "test"]) {
      expect(parseEnv({ ...version, NODE_ENV: value }).NODE_ENV).toBe(value);
    }
    expect(() => parseEnv({ ...version, NODE_ENV: "staging" })).toThrow();
  });

  it("defaults AI_PROVIDER to mock when unset or empty", () => {
    expect(parseEnv({ ...version }).AI_PROVIDER).toBe("mock");
    expect(parseEnv({ ...version, AI_PROVIDER: "" }).AI_PROVIDER).toBe("mock");
  });

  it("rejects an unknown AI_PROVIDER", () => {
    expect(() => parseEnv({ ...version, AI_PROVIDER: "openai" })).toThrow();
  });

  it("requires ANTHROPIC_API_KEY when AI_PROVIDER is anthropic", () => {
    expect(() => parseEnv({ ...version, AI_PROVIDER: "anthropic" })).toThrow();
    expect(() =>
      parseEnv({ ...version, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "" }),
    ).toThrow();
    const key = "test-key";
    expect(
      parseEnv({ ...version, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: key }).ANTHROPIC_API_KEY,
    ).toBe(key);
  });

  it("defaults AI_TIMEOUT_MS to 8000 when unset or empty", () => {
    expect(parseEnv({ ...version }).AI_TIMEOUT_MS).toBe(8000);
    expect(parseEnv({ ...version, AI_TIMEOUT_MS: "" }).AI_TIMEOUT_MS).toBe(8000);
  });

  it("parses AI_TIMEOUT_MS as a whole number of milliseconds up to 60 s", () => {
    expect(parseEnv({ ...version, AI_TIMEOUT_MS: "12000" }).AI_TIMEOUT_MS).toBe(12000);
    expect(parseEnv({ ...version, AI_TIMEOUT_MS: "60000" }).AI_TIMEOUT_MS).toBe(60000);
    for (const value of ["0", "-1", "1.5", "soon", "60001", "3000000000"]) {
      expect(() => parseEnv({ ...version, AI_TIMEOUT_MS: value })).toThrow();
    }
  });

  it("does not put the API key in the error message", () => {
    const secret = "sk-sentinel-key";
    let message = "";
    try {
      parseEnv({ ...version, AI_PROVIDER: "openai", ANTHROPIC_API_KEY: secret });
    } catch (error) {
      message = String(error);
    }
    expect(message).not.toBe("");
    expect(message).not.toContain(secret);
  });

  it("defaults the request limits and bounds them", () => {
    const env = parseEnv({ ...version });
    expect(env.MAX_QUERY_CHARS).toBe(200);
    expect(env.MAX_BODY_BYTES).toBe(4096);
    expect(parseEnv({ ...version, MAX_QUERY_CHARS: "" }).MAX_QUERY_CHARS).toBe(200);
    expect(() => parseEnv({ ...version, MAX_QUERY_CHARS: "0" })).toThrow();
    expect(() => parseEnv({ ...version, MAX_BODY_BYTES: "1000000" })).toThrow();
    expect(env.RATE_LIMIT_PER_MINUTE).toBe(20);
    expect(parseEnv({ ...version, RATE_LIMIT_PER_MINUTE: "5" }).RATE_LIMIT_PER_MINUTE).toBe(5);
    expect(() => parseEnv({ ...version, RATE_LIMIT_PER_MINUTE: "0" })).toThrow();
    expect(() => parseEnv({ ...version, RATE_LIMIT_PER_MINUTE: "100000" })).toThrow();
  });
});
