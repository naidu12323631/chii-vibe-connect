import type { Plan } from "@/hooks/usePlans";
import { categoryOf, fillPercent, isThisWeek, isToday, isUpcoming, type FeedFilter, type SortKey } from "@/lib/planMeta";

/** Free-text match across title, description, location and host name. */
export const searchPlans = (plans: Plan[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return plans;
  return plans.filter((p) =>
    [p.title, p.description, p.location, p.profile?.display_name].some((f) => f?.toLowerCase().includes(q)),
  );
};

/**
 * Chip filters. "nearby" matches the city saved on this device; with no city
 * set it falls back to any plan that has a place attached. "online" keeps plans
 * whose host is in the app right now.
 */
export const applyFilter = (
  plans: Plan[],
  filter: FeedFilter,
  opts: { city: string; onlineIds: Set<string> },
) => {
  switch (filter) {
    case "today":
      return plans.filter((p) => isToday(p.plan_time));
    case "week":
      return plans.filter((p) => isThisWeek(p.plan_time));
    case "nearby": {
      const city = opts.city.trim().toLowerCase();
      if (!city) return plans.filter((p) => !!p.location || !!p.maps_url);
      return plans.filter((p) => p.location?.toLowerCase().includes(city));
    }
    case "online":
      return plans.filter((p) => opts.onlineIds.has(p.user_id));
    default:
      return plans;
  }
};

export const sortPlans = (plans: Plan[], sort: SortKey) => {
  const copy = [...plans];
  switch (sort) {
    case "soonest":
      // Plans with a time first (earliest upcoming), undated ones after.
      return copy.sort((a, b) => {
        if (!a.plan_time && !b.plan_time) return 0;
        if (!a.plan_time) return 1;
        if (!b.plan_time) return -1;
        return new Date(a.plan_time).getTime() - new Date(b.plan_time).getTime();
      });
    case "popular":
      return copy.sort((a, b) => b.participants.length - a.participants.length);
    default:
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};

/** Most-joined plans, used by the "Popular right now" rail. */
export const popularPlans = (plans: Plan[], limit = 6) =>
  plans
    .filter((p) => p.participants.length > 0)
    .sort((a, b) => b.participants.length - a.participants.length)
    .slice(0, limit);

// --------------------------------------------------------------- explore views

export type Destination = {
  /** Lower-cased location string, used as the lookup key. */
  key: string;
  /** Place name — the part before the first comma. */
  name: string;
  /** Whatever followed the comma (usually the city), or null. */
  area: string | null;
  /** Full original location string. */
  location: string;
  count: number;
  /** Vibe of the busiest plan there, used for the card's cover art. */
  categoryKey: string;
};

/**
 * Groups plans by their location into "popular destinations", busiest first.
 * "Indiranagar, Bangalore" splits into name + area for the two-line card.
 */
export const destinationsFrom = (plans: Plan[], limit = 8): Destination[] => {
  const groups = new Map<string, Plan[]>();
  for (const plan of plans) {
    const location = plan.location?.trim();
    if (!location) continue;
    const key = location.toLowerCase();
    const bucket = groups.get(key);
    if (bucket) bucket.push(plan);
    else groups.set(key, [plan]);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const location = group[0].location!.trim();
      const [name, ...rest] = location.split(",");
      const busiest = [...group].sort((a, b) => b.participants.length - a.participants.length)[0];
      return {
        key,
        name: name.trim(),
        area: rest.length ? rest.join(",").trim() : null,
        location,
        count: group.length,
        categoryKey: categoryOf(busiest).key,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
};

/** Hottest plans — fullest first, then most recently posted. */
export const trendingPlans = (plans: Plan[], limit = 8) =>
  plans
    .filter((p) => p.participants.length > 0)
    .sort((a, b) =>
      fillPercent(b) - fillPercent(a) ||
      b.participants.length - a.participants.length ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

/** Dated plans still to come, soonest first. */
export const upcomingPlans = (plans: Plan[], limit = 8) =>
  plans
    .filter((p) => isUpcoming(p.plan_time))
    .sort((a, b) => new Date(a.plan_time!).getTime() - new Date(b.plan_time!).getTime())
    .slice(0, limit);

/** How many plans sit in each vibe, for the "Browse by vibe" cards. */
export const countByCategory = (plans: Plan[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const plan of plans) {
    const key = categoryOf(plan).key;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};
