import { describe, expect, it, vi } from "vitest";
import { HealthResponse } from "@/domain/api";
import { GET } from "./route";

// `connection()` only works inside a Next request scope.
vi.mock("next/server", () => ({ connection: async () => {} }));

describe("GET /api/health", () => {
  it("reports the version, the AI provider and model and the data adapter", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual({
      status: "ok",
      version: "v0.0.0+test",
      ai: { provider: "mock", model: "none" },
      data: { adapter: "in-memory" },
      debug: false,
    });
    expect(HealthResponse.safeParse(body).success).toBe(true);
  });
});
