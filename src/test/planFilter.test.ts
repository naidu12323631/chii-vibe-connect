import { describe, expect, it } from "vitest";
import type { Plan } from "@/hooks/usePlans";
import {
  applyFilter, countByCategory, destinationsFrom, popularPlans, searchPlans, sortPlans,
  trendingPlans, upcomingPlans,
} from "@/lib/planFilter";
import { categoryOf, fillPercent, formatWhen } from "@/lib/planMeta";

const HOUR = 60 * 60 * 1000;

const makePlan = (over: Partial<Plan> & { id: string }): Plan => ({
  user_id: "host-1",
  title: "Coffee & co-work",
  description: null,
  location: "Bangalore",
  maps_url: null,
  plan_time: null,
  max_participants: 4,
  created_at: new Date().toISOString(),
  participants: [],
  profile: { id: "host-1", display_name: "Ken", avatar_url: null },
  ...over,
});

describe("searchPlans", () => {
  const plans = [
    makePlan({ id: "a", title: "Rooftop hangout", location: "Chennai" }),
    makePlan({ id: "b", title: "Board game night", location: "Bangalore" }),
  ];

  it("returns everything for an empty query", () => {
    expect(searchPlans(plans, "   ")).toHaveLength(2);
  });

  it("matches title, location and host name case-insensitively", () => {
    expect(searchPlans(plans, "ROOFTOP").map((p) => p.id)).toEqual(["a"]);
    expect(searchPlans(plans, "bangalore").map((p) => p.id)).toEqual(["b"]);
    expect(searchPlans(plans, "ken")).toHaveLength(2);
  });
});

describe("applyFilter", () => {
  const today = makePlan({ id: "today", plan_time: new Date(Date.now() + 2 * HOUR).toISOString() });
  const nextWeek = makePlan({ id: "next-week", plan_time: new Date(Date.now() + 10 * 24 * HOUR).toISOString() });
  const noPlace = makePlan({ id: "no-place", location: null, maps_url: null });
  const chennai = makePlan({ id: "chennai", location: "Chennai", user_id: "host-2" });
  const plans = [today, nextWeek, noPlace, chennai];
  const noCity = { city: "", onlineIds: new Set<string>() };

  it("keeps only plans happening today", () => {
    expect(applyFilter(plans, "today", noCity).map((p) => p.id)).toEqual(["today"]);
  });

  it("keeps plans inside the next seven days", () => {
    const ids = applyFilter(plans, "week", noCity).map((p) => p.id);
    expect(ids).toContain("today");
    expect(ids).not.toContain("next-week");
  });

  it("matches the saved city for 'nearby'", () => {
    const ids = applyFilter(plans, "nearby", { ...noCity, city: " chennai " }).map((p) => p.id);
    expect(ids).toEqual(["chennai"]);
  });

  it("falls back to any plan with a place when no city is saved", () => {
    expect(applyFilter(plans, "nearby", noCity).map((p) => p.id)).not.toContain("no-place");
  });

  it("keeps plans whose host is online", () => {
    const ids = applyFilter(plans, "online", { city: "", onlineIds: new Set(["host-2"]) }).map((p) => p.id);
    expect(ids).toEqual(["chennai"]);
  });

  it("passes everything through for 'all'", () => {
    expect(applyFilter(plans, "all", noCity)).toHaveLength(4);
  });
});

describe("sortPlans", () => {
  const soon = makePlan({ id: "soon", plan_time: new Date(Date.now() + HOUR).toISOString() });
  const later = makePlan({ id: "later", plan_time: new Date(Date.now() + 5 * HOUR).toISOString() });
  const undated = makePlan({ id: "undated", plan_time: null });

  it("orders dated plans first when sorting by soonest", () => {
    expect(sortPlans([undated, later, soon], "soonest").map((p) => p.id)).toEqual(["soon", "later", "undated"]);
  });

  it("orders by participant count when sorting by popular", () => {
    const busy = makePlan({ id: "busy", participants: [{ user_id: "u1", profile: null }, { user_id: "u2", profile: null }] });
    const quiet = makePlan({ id: "quiet" });
    expect(sortPlans([quiet, busy], "popular").map((p) => p.id)).toEqual(["busy", "quiet"]);
  });

  it("does not mutate the input array", () => {
    const input = [undated, soon];
    sortPlans(input, "soonest");
    expect(input.map((p) => p.id)).toEqual(["undated", "soon"]);
  });
});

describe("popularPlans", () => {
  it("skips plans nobody has joined and caps the list", () => {
    const joined = makePlan({ id: "joined", participants: [{ user_id: "u1", profile: null }] });
    const empty = makePlan({ id: "empty" });
    expect(popularPlans([empty, joined]).map((p) => p.id)).toEqual(["joined"]);
    expect(popularPlans([joined, joined, joined], 2)).toHaveLength(2);
  });
});

describe("categoryOf", () => {
  it("infers a vibe from the title", () => {
    expect(categoryOf({ title: "Cafee" }).label).toBe("Food");
    expect(categoryOf({ title: "Coffee & Co-work" }).label).toBe("Chill");
    expect(categoryOf({ title: "Sunset Cycling" }).label).toBe("Adventure");
    expect(categoryOf({ title: "Study Together" }).label).toBe("Study");
  });

  it("prefers the specific vibe over the broad one", () => {
    // "Board Game Night" contains both "game" (Games) and "night" — Games wins.
    expect(categoryOf({ title: "Board Game Night" }).label).toBe("Games");
  });

  it("reads the description too", () => {
    expect(categoryOf({ title: "Tea", description: "Cafe" }).label).toBe("Food");
  });

  it("matches whole words, not substrings", () => {
    // "brunch" contains "run", "team" contains "tea", "bread" contains "read".
    expect(categoryOf({ title: "Sunday brunch" }).label).toBe("Food");
    expect(categoryOf({ title: "Team dinner" }).label).toBe("Food");
    expect(categoryOf({ title: "Bread baking" }).label).toBe("Hangout");
    expect(categoryOf({ title: "Skateboarding" }).label).not.toBe("Games");
  });

  it("falls back to a generic hangout", () => {
    expect(categoryOf({ title: "Something else entirely" }).label).toBe("Hangout");
  });
});

describe("destinationsFrom", () => {
  const plans = [
    makePlan({ id: "a", location: "Indiranagar, Bangalore" }),
    makePlan({ id: "b", location: "indiranagar, bangalore" }),
    makePlan({ id: "c", location: "Ulsoor Lake" }),
    makePlan({ id: "d", location: null }),
  ];

  it("groups case-insensitively and counts plans per place", () => {
    const [first, second] = destinationsFrom(plans);
    expect(first).toMatchObject({ name: "Indiranagar", area: "Bangalore", count: 2 });
    expect(second).toMatchObject({ name: "Ulsoor Lake", area: null, count: 1 });
  });

  it("skips plans with no location and respects the limit", () => {
    expect(destinationsFrom(plans).every((d) => d.name.length > 0)).toBe(true);
    expect(destinationsFrom(plans, 1)).toHaveLength(1);
  });
});

describe("trendingPlans", () => {
  it("ranks fuller plans higher regardless of headcount", () => {
    const nearlyFull = makePlan({
      id: "small-but-full",
      max_participants: 2,
      participants: [{ user_id: "u1", profile: null }],
    });
    const roomy = makePlan({
      id: "big-and-empty-ish",
      max_participants: 20,
      participants: [{ user_id: "u1", profile: null }, { user_id: "u2", profile: null }],
    });
    expect(trendingPlans([roomy, nearlyFull]).map((p) => p.id)).toEqual(["small-but-full", "big-and-empty-ish"]);
  });

  it("ignores plans nobody joined", () => {
    expect(trendingPlans([makePlan({ id: "empty" })])).toHaveLength(0);
  });
});

describe("upcomingPlans", () => {
  it("keeps only future dated plans, soonest first", () => {
    const past = makePlan({ id: "past", plan_time: new Date(Date.now() - HOUR).toISOString() });
    const soon = makePlan({ id: "soon", plan_time: new Date(Date.now() + HOUR).toISOString() });
    const later = makePlan({ id: "later", plan_time: new Date(Date.now() + 3 * HOUR).toISOString() });
    const undated = makePlan({ id: "undated", plan_time: null });
    expect(upcomingPlans([later, past, undated, soon]).map((p) => p.id)).toEqual(["soon", "later"]);
  });
});

describe("countByCategory", () => {
  it("tallies plans per vibe", () => {
    const counts = countByCategory([
      makePlan({ id: "1", title: "Coffee & Co-work" }),
      makePlan({ id: "2", title: "Tea break" }),
      makePlan({ id: "3", title: "Board Game Night" }),
    ]);
    expect(counts.chill).toBe(2);
    expect(counts.games).toBe(1);
  });
});

describe("fillPercent", () => {
  it("reports how full a plan is", () => {
    expect(fillPercent({ participants: [1, 2], max_participants: 4 })).toBe(50);
    expect(fillPercent({ participants: [], max_participants: 4 })).toBe(0);
  });

  it("never exceeds 100% or divides by zero", () => {
    expect(fillPercent({ participants: [1, 2, 3], max_participants: 2 })).toBe(100);
    expect(fillPercent({ participants: [1], max_participants: 0 })).toBe(100);
  });
});

describe("formatWhen", () => {
  it("labels today and tomorrow by name", () => {
    const today = new Date();
    today.setHours(16, 0, 0, 0);
    expect(formatWhen(today.toISOString())).toMatch(/^Today, /);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 30, 0, 0);
    expect(formatWhen(tomorrow.toISOString())).toMatch(/^Tomorrow, /);
  });

  it("uses a date for anything further out", () => {
    const later = new Date(Date.now() + 20 * 24 * HOUR);
    expect(formatWhen(later.toISOString())).not.toMatch(/^(Today|Tomorrow), /);
  });
});
