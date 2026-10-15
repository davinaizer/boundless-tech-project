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
});
