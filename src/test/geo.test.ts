import { describe, expect, it } from "vitest";
import { centroid, distanceKm, formatDistance, radiusLabel } from "@/lib/geo";

// Real coordinates so the distances can be sanity-checked against known values.
const KORAMANGALA = { lat: 12.9352, lng: 77.6245 };
const INDIRANAGAR = { lat: 12.9784, lng: 77.6408 };
const CHENNAI = { lat: 13.0827, lng: 80.2707 };

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm(KORAMANGALA, KORAMANGALA)).toBe(0);
  });

  it("measures a few kilometres across a city", () => {
    // Koramangala to Indiranagar is roughly 5 km.
    const km = distanceKm(KORAMANGALA, INDIRANAGAR);
    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(6);
  });

  it("measures hundreds of kilometres between cities", () => {
    // Bangalore to Chennai is roughly 290 km.
    const km = distanceKm(KORAMANGALA, CHENNAI);
    expect(km).toBeGreaterThan(270);
    expect(km).toBeLessThan(310);
  });

  it("is symmetric", () => {
    expect(distanceKm(KORAMANGALA, CHENNAI)).toBeCloseTo(distanceKm(CHENNAI, KORAMANGALA), 6);
  });
});

describe("formatDistance", () => {
  it("uses metres below a kilometre", () => {
    expect(formatDistance(0.45)).toBe("450 m");
    expect(formatDistance(0)).toBe("0 m");
  });

  it("uses one decimal up to ten kilometres", () => {
    expect(formatDistance(1.44)).toBe("1.4 km");
    expect(formatDistance(9.96)).toBe("10.0 km");
  });

  it("rounds to whole kilometres beyond ten", () => {
    expect(formatDistance(12.4)).toBe("12 km");
  });

  it("returns nothing for a non-finite distance", () => {
    expect(formatDistance(Infinity)).toBe("");
    expect(formatDistance(NaN)).toBe("");
  });
});

describe("centroid", () => {
  it("averages the points", () => {
    expect(centroid([{ lat: 0, lng: 0 }, { lat: 2, lng: 4 }])).toEqual({ lat: 1, lng: 2 });
  });

  it("is null with no points", () => {
    expect(centroid([])).toBeNull();
  });
});

describe("radiusLabel", () => {
  it("treats zero as no limit", () => {
    expect(radiusLabel(0)).toBe("Any distance");
    expect(radiusLabel(5)).toBe("Within 5 km");
  });
});
