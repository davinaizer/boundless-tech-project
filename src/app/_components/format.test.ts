import { describe, expect, it } from "vitest";
import { estimateSavings } from "@/domain/savings";
import { SAMPLE_OFFERS } from "@/data/sample-catalogue";
import { formatMargin, formatPence, formatPounds, tierText, validityText } from "./format";

describe("formatPence", () => {
  it("shows whole pounds without decimals and others with two", () => {
    expect(formatPence(4500)).toBe("£45");
    expect(formatPence(0)).toBe("£0");
    expect(formatPence(1250)).toBe("£12.50");
    expect(formatPence(5)).toBe("£0.05");
  });

  it("keeps the sign of a negative amount", () => {
    expect(formatPence(-600)).toBe("-£6");
  });

  it("formats pounds through pence, avoiding float noise", () => {
    expect(formatPounds(30)).toBe("£30");
    expect(formatPounds(12.1)).toBe("£12.10");
    expect(formatPounds(0.29)).toBe("£0.29");
  });
});

describe("formatMargin", () => {
  it("says ahead for zero or more and short for less", () => {
    expect(formatMargin(600)).toBe("£6 ahead");
    expect(formatMargin(0)).toBe("£0 ahead");
    expect(formatMargin(-1250)).toBe("£12.50 short");
  });
});

describe("validityText", () => {
  it("says valid all year with no expiry", () => {
    expect(validityText(undefined)).toBe("Valid all year");
  });

  it("writes the date in full without moving it by time zone", () => {
    expect(validityText("2026-12-31")).toBe("Valid until 31 December 2026");
    expect(validityText("2027-01-01")).toBe("Valid until 1 January 2027");
  });
});

describe("tierText", () => {
  it("writes eligibility in words", () => {
    expect(tierText("standard")).toBe("Included with Standard and Plus");
    expect(tierText("plus")).toBe("Plus membership only");
  });
});

describe("the fee panel's figures", () => {
  it("format the estimate for the sample catalogue without non-finite numbers", () => {
    const savings = estimateSavings(SAMPLE_OFFERS);
    for (const tier of savings.tiers) {
      expect(formatPence(tier.feePence)).toMatch(/^£\d+(\.\d{2})?$/);
      expect(formatMargin(tier.marginPence)).toMatch(/^£\d+(\.\d{2})? (ahead|short)$/);
    }
  });
});
