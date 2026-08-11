import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown, Clock, Compass, Heart, Loader2, LocateFixed, MapPin, Plus, Search,
  SlidersHorizontal, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PlanMap, { type Spot } from "@/components/app/PlanMap";
import CoverImage, { slugify } from "@/components/app/CoverImage";
import { useCreatePlan } from "@/components/app/AppShell";
import { usePlans, type Plan } from "@/hooks/usePlans";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import { useGeocodedLocations } from "@/hooks/useGeocode";
import { useUserLocation } from "@/hooks/useUserLocation";
import { distanceKm, formatDistance, radiusLabel, RADIUS_OPTIONS, type LatLng } from "@/lib/geo";
import { CATEGORIES, categoryOf, formatWhen } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

const VISIBLE_CHIPS = 4;

type MapSort = "nearest" | "soonest" | "going" | "newest";

const SORTS: { key: MapSort; label: string }[] = [
  { key: "nearest", label: "Nearest first" },
  { key: "soonest", label: "Happening soonest" },
  { key: "going", label: "Most people going" },
  { key: "newest", label: "Newest first" },
];

type Located = Plan & { coords?: LatLng; distance?: number };

const spotsLeft = (plan: Plan) => Math.max(0, plan.max_participants - plan.participants.length);

const SpotsBadge = ({ plan }: { plan: Plan }) => {
  const left = spotsLeft(plan);
  const category = categoryOf(plan);
  return (
    <span
      className={cn(
        "absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm",
        left === 0 ? "bg-muted-foreground" : category.palette.solid,
      )}
    >
      {left === 0 ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}
    </span>
  );
};

/** Horizontal card in the "Nearby plans" sheet. */
const NearbyCard = ({ plan }: { plan: Located }) => {
  const { isSaved, toggleSaved } = useSavedPlans();
  const category = categoryOf(plan);
  const saved = isSaved(plan.id);

  return (
    <div className="w-[215px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:border-primary/30 hover:shadow-lg lg:w-auto">
      <div className="relative">
        <Link to={`/plans/${plan.id}`}>
          <CoverImage slug={slugify(plan.title)} category={category} coverUrl={plan.cover_url} className="h-[125px] w-full" />
        </Link>
        <SpotsBadge plan={plan} />
        <button
          onClick={() => toggleSaved(plan.id)}
          aria-label={saved ? "Remove from saved" : "Save plan"}
          aria-pressed={saved}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background"
        >
          <Heart className={cn("h-4 w-4", saved ? "fill-rose-500 text-rose-500" : "text-foreground")} />
        </button>
      </div>
      <div className="p-3">
        <Link to={`/plans/${plan.id}`} className="block truncate text-[15px] font-bold hover:text-primary">
          {plan.title}
        </Link>
        <p className="truncate text-[13px] text-muted-foreground">{plan.location}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {plan.plan_time ? formatWhen(plan.plan_time) : "Anytime"}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5 text-[12px]">
          <span className="flex items-center gap-1 font-medium text-primary">
            <Users className="h-3.5 w-3.5" /> {plan.participants.length}/{plan.max_participants} going
          </span>
          {plan.distance !== undefined && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {formatDistance(plan.distance)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const MapsPage = () => {
  const { plans, loading } = usePlans();
  const { saved } = useSavedPlans();
  const { position, status, locate } = useUserLocation();
  const openCreate = useCreatePlan();
  const navigate = useNavigate();

  const [vibe, setVibe] = useState("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [radius, setRadius] = useState<number>(5);
  const [sort, setSort] = useState<MapSort>("soonest");
  const [openOnly, setOpenOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState<LatLng | null>(null);

  const mappable = useMemo(() => plans.filter((p) => !!p.location?.trim()), [plans]);
  const locations = useMemo(() => mappable.map((p) => p.location!), [mappable]);
  const { pending, lookup } = useGeocodedLocations(locations);

  // Nearest only makes sense with a fix; fall back until we have one.
  const effectiveSort: MapSort = sort === "nearest" && !position ? "soonest" : sort;
  const radiusActive = !!position && radius > 0;

  const located: Located[] = useMemo(
    () =>
      mappable.map((plan) => {
        const coords = lookup(plan.location);
        return {
          ...plan,
          coords,
          distance: coords && position ? distanceKm(position, coords) : undefined,
        };
      }),
    // `lookup` is rebuilt whenever resolved coords change, so results stream in.
    [mappable, lookup, position],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = located;
    if (vibe !== "all") list = list.filter((p) => categoryOf(p).key === vibe);
    if (q) list = list.filter((p) => [p.title, p.location, p.description].some((f) => f?.toLowerCase().includes(q)));
    if (openOnly) list = list.filter((p) => spotsLeft(p) > 0);
    if (savedOnly) list = list.filter((p) => saved.has(p.id));
    // Unplaceable plans can't be measured, so a radius filter excludes them.
    if (radiusActive) list = list.filter((p) => p.distance !== undefined && p.distance <= radius);
    return list;
  }, [located, vibe, query, openOnly, savedOnly, saved, radiusActive, radius]);

  const sheetPlans = useMemo(() => {
    const copy = [...filtered];
    switch (effectiveSort) {
      case "nearest":
        return copy.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      case "going":
        return copy.sort((a, b) => b.participants.length - a.participants.length);
      case "newest":
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default:
        return copy.sort((a, b) => {
          if (!a.plan_time && !b.plan_time) return 0;
          if (!a.plan_time) return 1;
          if (!b.plan_time) return -1;
          return new Date(a.plan_time).getTime() - new Date(b.plan_time).getTime();
        });
    }
  }, [filtered, effectiveSort]);

  // Plans at the same resolved place share a pin.
  const spots: Spot[] = useMemo(() => {
    const groups = new Map<string, Spot>();
    for (const plan of filtered) {
      if (!plan.coords) continue;
      const key = plan.location!.trim().toLowerCase();
      const existing = groups.get(key);
      if (existing) existing.plans.push(plan);
      else groups.set(key, { key, location: plan.location!.trim(), position: plan.coords, plans: [plan] });
    }
    return [...groups.values()];
  }, [filtered]);

  const selectedSpot = spots.find((s) => s.key === selectedKey) ?? null;
  // Selecting a pin narrows the sheet to that place.
  const visiblePlans = selectedSpot
    ? sheetPlans.filter((p) => p.location?.trim().toLowerCase() === selectedSpot.key)
    : sheetPlans;

  // Drop a stale selection when filters remove that place.
  useEffect(() => {
    if (selectedKey && !spots.some((s) => s.key === selectedKey)) setSelectedKey(null);
  }, [spots, selectedKey]);

  const unplaceable = filtered.length - filtered.filter((p) => p.coords).length;
  const hiddenByRadius = radiusActive
    ? located.filter((p) => p.distance !== undefined && p.distance > radius).length
    : 0;

  const chips = [
    { key: "all", label: "All", icon: MapPin, iconClass: "" },
    ...CATEGORIES.slice(0, VISIBLE_CHIPS),
  ];
  const overflowChips = CATEGORIES.slice(VISIBLE_CHIPS);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* -------------------------------------------------------------- header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Milo Map</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">See what's happening around you ✨</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-full bg-card" aria-label="Filters">
                <SlidersHorizontal className="h-[18px] w-[18px] text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="app-theme w-72">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="open-only">Has spots left</Label>
                  <p className="text-xs text-muted-foreground">Hide plans that are full</p>
                </div>
                <Switch id="open-only" checked={openOnly} onCheckedChange={setOpenOnly} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="map-saved">Saved only</Label>
                  <p className="text-xs text-muted-foreground">Just your bookmarks</p>
                </div>
                <Switch id="map-saved" checked={savedOnly} onCheckedChange={setSavedOnly} />
              </div>
              <div className="mt-4 space-y-1">
                <Label>Distance</Label>
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    onClick={() => { setRadius(km); if (km > 0 && !position) locate(); }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                      radius === km ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {radiusLabel(km)}
                    {radius === km && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full bg-card"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Search plans"
            aria-expanded={searchOpen}
          >
            {searchOpen ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans or places..."
            aria-label="Search plans or places"
            className="h-12 rounded-2xl border-border bg-card pl-10"
          />
        </div>
      )}

      {/* --------------------------------------------------------- vibe filters */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {chips.map((chip) => {
          const active = vibe === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => { setVibe(chip.key); setSelectedKey(null); }}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "gradient-primary border-transparent text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <chip.icon className={cn("h-4 w-4", active ? "text-primary-foreground" : chip.iconClass)} />
              {chip.label}
            </button>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              overflowChips.some((c) => c.key === vibe)
                ? "gradient-primary border-transparent text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            {overflowChips.find((c) => c.key === vibe)?.label ?? "More"}
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="app-theme">
            {overflowChips.map((category) => (
              <DropdownMenuItem key={category.key} onClick={() => { setVibe(category.key); setSelectedKey(null); }}>
                <category.icon className={cn("mr-2 h-4 w-4", category.iconClass)} /> {category.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ----------------------------------------------------------------- map */}
      <div className="relative -mx-4 mt-4 h-[420px] overflow-hidden bg-muted sm:rounded-3xl lg:mx-0 lg:h-[560px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <PlanMap
            spots={spots}
            userPosition={position}
            focus={focus}
            selectedKey={selectedKey}
            onSelectSpot={(key) => {
              setSelectedKey(key);
              const spot = spots.find((s) => s.key === key);
              if (spot) setFocus(spot.position);
            }}
            onOpenPlan={(plan) => navigate(`/plans/${plan.id}`)}
          />
        )}

        {/* Places still being looked up. */}
        {pending > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" /> Placing {pending} location{pending === 1 ? "" : "s"}…
          </div>
        )}

        {selectedSpot && (
          <button
            onClick={() => setSelectedKey(null)}
            className="absolute right-3 top-3 z-[400] flex items-center gap-1 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur"
          >
            <X className="h-3 w-3" /> {selectedSpot.location}
          </button>
        )}

        <button
          onClick={() => { locate(); if (position) setFocus({ ...position }); }}
          aria-label="Centre the map on my location"
          className="absolute bottom-4 right-4 z-[400] flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-lg transition-transform active:scale-95"
        >
          {status === "locating"
            ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
            : <LocateFixed className={cn("h-5 w-5", position ? "text-primary" : "text-muted-foreground")} />}
        </button>
      </div>

      {/* --------------------------------------------------- nearby plans sheet */}
      <div className="-mx-4 rounded-t-3xl border-t border-border bg-card px-4 pb-2 pt-3 shadow-[0_-8px_24px_-12px_hsl(240_10%_10%/0.12)] sm:mx-0 sm:mt-4 sm:rounded-3xl sm:border">
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse the list" : "Expand the list"}
          aria-expanded={expanded}
          className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-border transition-colors hover:bg-muted-foreground/40"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-[18px] w-[18px] text-primary" />
              {selectedSpot ? selectedSpot.location : "Nearby plans"}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                {position ? radiusLabel(radius) : "Enable location"}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="app-theme">
                {!position && (
                  <DropdownMenuItem onClick={locate}>
                    <LocateFixed className="mr-2 h-4 w-4" /> Use my location
                  </DropdownMenuItem>
                )}
                {RADIUS_OPTIONS.map((km) => (
                  <DropdownMenuItem
                    key={km}
                    onClick={() => { setRadius(km); if (km > 0 && !position) locate(); }}
                    className={radius === km ? "font-semibold text-primary" : undefined}
                  >
                    {radiusLabel(km)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 4v16M7 20l-3-3M17 20V4M17 4l3 3" />
              </svg>
              Sort
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="app-theme">
              {SORTS.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => { setSort(option.key); if (option.key === "nearest" && !position) locate(); }}
                  className={effectiveSort === option.key ? "font-semibold text-primary" : undefined}
                >
                  {option.label}
                  {option.key === "nearest" && !position && (
                    <span className="ml-2 text-xs text-muted-foreground">needs location</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ------------------------------------------------------------- cards */}
        <div className="mt-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading plans…</p>
          ) : visiblePlans.length === 0 ? (
            <div className="py-10 text-center">
              <Compass className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <h3 className="font-semibold">No plans here yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {hiddenByRadius > 0
                  ? `${hiddenByRadius} plan${hiddenByRadius === 1 ? "" : "s"} sit outside ${radiusLabel(radius).toLowerCase()}.`
                  : "Plans appear here once they have a location."}
              </p>
              {hiddenByRadius > 0 ? (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setRadius(0)}>
                  Show any distance
                </Button>
              ) : (
                <Button variant="gradient" size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Create a new plan
                </Button>
              )}
            </div>
          ) : expanded ? (
            <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 lg:grid-cols-4">
              {visiblePlans.map((plan) => <NearbyCard key={plan.id} plan={plan} />)}
            </div>
          ) : (
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {visiblePlans.slice(0, 8).map((plan) => <NearbyCard key={plan.id} plan={plan} />)}
            </div>
          )}

          {unplaceable > 0 && !expanded && visiblePlans.length > 0 && (
            <p className="pb-1 text-center text-[11px] text-muted-foreground">
              {unplaceable} plan{unplaceable === 1 ? "" : "s"} couldn't be placed on the map.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
