import { describe, expect, it } from "vitest";
import { TRUST_MAX_PERCENT, trustExplainer, trustPercent, trustTier } from "@/lib/trust";

describe("trustPercent", () => {
  it("is zero with no followers", () => {
    expect(trustPercent(0)).toBe(0);
    expect(trustPercent(null)).toBe(0);
    expect(trustPercent(undefined)).toBe(0);
  });

  it("ignores nonsense counts", () => {
    expect(trustPercent(-5)).toBe(0);
    expect(trustPercent(NaN)).toBe(0);
    expect(trustPercent(Infinity)).toBe(0);
  });

  it("rises fast for the first followers and slows down after", () => {
    const first = trustPercent(10) - trustPercent(1);
    const later = trustPercent(200) - trustPercent(191);
    expect(first).toBeGreaterThan(later);
  });

  it("never exceeds the cap", () => {
    expect(trustPercent(500)).toBe(TRUST_MAX_PERCENT);
    expect(trustPercent(100_000)).toBe(TRUST_MAX_PERCENT);
  });

  it("increases with followers", () => {
    const counts = [1, 5, 10, 50, 100, 400];
    const scores = counts.map(trustPercent);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });
});

describe("trustTier", () => {
  it("bands the score", () => {
    expect(trustTier(0).label).toBe("New here");
    expect(trustTier(30).label).toBe("Rising");
    expect(trustTier(60).label).toBe("Trusted");
    expect(trustTier(90).label).toBe("Highly trusted");
  });
});

describe("trustExplainer", () => {
  it("singularises one follower", () => {
    expect(trustExplainer(11, 1)).toContain("1 follower");
    expect(trustExplainer(39, 10)).toContain("10 followers");
  });
});
