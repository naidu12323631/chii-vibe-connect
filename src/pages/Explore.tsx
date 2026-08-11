import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  ArrowRight, CalendarDays, ChevronLeft, Compass, Flame, Heart, MapPin, Plus,
  Search, SlidersHorizontal, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PlanCard from "@/components/app/PlanCard";
import CoverImage, { slugify } from "@/components/app/CoverImage";
import { useCreatePlan } from "@/components/app/AppShell";
import { usePlans, type Plan } from "@/hooks/usePlans";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import {
  countByCategory, destinationsFrom, searchPlans, sortPlans, trendingPlans, upcomingPlans,
  type Destination,
} from "@/lib/planFilter";
import {
  CATEGORIES, categoryByKey, categoryOf, fillPercent, formatWhen, SORT_OPTIONS, type SortKey,
} from "@/lib/planMeta";
import { cn } from "@/lib/utils";

type Expanded = "destinations" | "trending" | "upcoming" | null;

const SectionHeader = ({
  icon: Icon,
  iconClass,
  title,
  onSeeAll,
}: {
  icon: typeof MapPin;
  iconClass: string;
  title: string;
  onSeeAll?: () => void;
}) => (
  <div className="mb-3 flex items-center justify-between">
    <h2 className="flex items-center gap-2 text-base font-bold">
      <Icon className={cn("h-[18px] w-[18px]", iconClass)} /> {title}
    </h2>
    {onSeeAll && (
      <button onClick={onSeeAll} className="text-sm font-medium text-primary hover:underline">
        See all
      </button>
    )}
  </div>
);

/** Horizontal rail on phones, an even grid on laptops. */
const Rail = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:overflow-visible lg:px-0", className)}>
    {children}
  </div>
);

const DestinationCard = ({
  destination,
  trending,
  onSelect,
}: {
  destination: Destination;
  trending?: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className="w-[190px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card transition-all hover:border-primary/30 hover:shadow-lg lg:w-auto"
  >
    <div className="relative">
      <CoverImage
        slug={slugify(destination.location)}
        category={categoryByKey(destination.categoryKey)}
        className="h-[150px] w-full"
      />
      {trending && (
        <span className="gradient-primary absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-glow">
          <Flame className="h-3 w-3" /> Trending
        </span>
      )}
    </div>
    <div className="p-3">
      <h3 className="truncate text-[15px] font-bold">{destination.name}</h3>
      <p className="truncate text-[13px] text-muted-foreground">{destination.area ?? "Nearby"}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-primary">
        {destination.count} {destination.count === 1 ? "plan" : "plans"}
      </p>
    </div>
  </button>
);

const TrendingCard = ({ plan }: { plan: Plan }) => {
  const category = categoryOf(plan);
  return (
    <Link
      to={`/plans/${plan.id}`}
      className="w-[155px] shrink-0 snap-start lg:w-auto"
    >
      <div className="relative">
        <CoverImage slug={slugify(plan.title)} category={category} coverUrl={plan.cover_url} className="h-[100px] w-full rounded-xl" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-bold shadow-sm backdrop-blur">
          <Flame className="h-3 w-3 text-orange-500" /> {fillPercent(plan)}%
        </span>
      </div>
      <h3 className="mt-2 truncate text-[13px] font-bold">{plan.title}</h3>
      <p className="truncate text-[11px] text-muted-foreground">{plan.location ?? "Anywhere"}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        <span className="font-bold text-primary">{plan.participants.length}</span> / {plan.max_participants} going
      </p>
    </Link>
  );
};

const UpcomingRow = ({ plan }: { plan: Plan }) => {
  const { toggleJoin, isJoined } = usePlans();
  const category = categoryOf(plan);
  const joined = isJoined(plan);
  const full = plan.participants.length >= plan.max_participants;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition-colors hover:border-primary/30">
      <Link to={`/plans/${plan.id}`} className="shrink-0">
        <CoverImage slug={slugify(plan.title)} category={category} coverUrl={plan.cover_url} className="h-14 w-14 rounded-xl" iconClassName="h-7 w-7 right-1 top-1" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/plans/${plan.id}`} className="block truncate text-[15px] font-bold hover:text-primary">
          {plan.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          {plan.plan_time && (
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatWhen(plan.plan_time)}</span>
          )}
          {plan.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {plan.location}</span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {plan.participants.length} / {plan.max_participants} going
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20"
        onClick={() => toggleJoin(plan)}
        disabled={!joined && full}
      >
        {joined ? "Leave" : full ? "Full" : "Join"}
      </Button>
    </div>
  );
};

const Explore = () => {
  const { plans, loading } = usePlans();
  const { saved } = useSavedPlans();
  const openCreate = useCreatePlan();

  const [query, setQuery] = useState("");
  const [vibe, setVibe] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [expanded, setExpanded] = useState<Expanded>(null);

  // The discovery sections give way to a result list as soon as you narrow down.
  const filtering = query.trim() !== "" || vibe !== "all" || savedOnly;
  const showDiscovery = !filtering && expanded === null;

  const destinations = useMemo(() => destinationsFrom(plans, expanded === "destinations" ? 100 : 8), [plans, expanded]);
  const trending = useMemo(() => trendingPlans(plans), [plans]);
  const upcoming = useMemo(() => upcomingPlans(plans), [plans]);
  const vibeCounts = useMemo(() => countByCategory(plans), [plans]);

  const results = useMemo(() => {
    let list = searchPlans(plans, query);
    if (vibe !== "all") list = list.filter((p) => categoryOf(p).key === vibe);
    if (savedOnly) list = list.filter((p) => saved.has(p.id));
    if (expanded === "trending") return trendingPlans(list, 100);
    if (expanded === "upcoming") return upcomingPlans(list, 100);
    return sortPlans(list, sort);
  }, [plans, query, vibe, savedOnly, saved, sort, expanded]);

  const resetView = () => {
    setExpanded(null);
    setVibe("all");
    setQuery("");
    setSavedOnly(false);
  };

  const expandedTitle = expanded === "destinations"
    ? "All destinations"
    : expanded === "trending"
    ? "Trending now"
    : "Upcoming plans";

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* --------------------------------------------------------- search + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, places, or plans..."
            aria-label="Search people, places, or plans"
            className="h-12 rounded-2xl border-border bg-card pl-10"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-2xl bg-card" aria-label="Filters and sorting">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="app-theme w-72">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="saved-only">Saved only</Label>
                <p className="text-xs text-muted-foreground">Just your bookmarked plans</p>
              </div>
              <Switch id="saved-only" checked={savedOnly} onCheckedChange={setSavedOnly} />
            </div>
            <div className="mt-4 space-y-1">
              <Label>Sort by</Label>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                    sort === opt.key ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {opt.label}
                  {sort === opt.key && <span className="h-2 w-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ------------------------------------------------------------ vibe chips */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {[{ key: "all", label: "All", icon: null, iconClass: "" }, ...CATEGORIES].map((chip) => {
          const active = vibe === chip.key;
          const Icon = chip.icon;
          return (
            <button
              key={chip.key}
              onClick={() => { setVibe(chip.key); setExpanded(null); }}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "gradient-primary border-transparent text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {Icon && <Icon className={cn("h-4 w-4", active ? "text-primary-foreground" : chip.iconClass)} />}
              {chip.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading plans…</p>
      ) : showDiscovery ? (
        <>
          {/* ------------------------------------------- popular destinations */}
          {destinations.length > 0 && (
            <section className="mt-6">
              <SectionHeader
                icon={MapPin}
                iconClass="text-rose-500"
                title="Popular destinations"
                onSeeAll={destinations.length > 4 ? () => setExpanded("destinations") : undefined}
              />
              <Rail className="lg:grid lg:grid-cols-4">
                {destinations.slice(0, 8).map((destination, i) => (
                  <DestinationCard
                    key={destination.key}
                    destination={destination}
                    trending={i === 0}
                    onSelect={() => setQuery(destination.location)}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* ------------------------------------------------------ trending now */}
          {trending.length > 0 && (
            <section className="mt-7">
              <SectionHeader
                icon={TrendingUp}
                iconClass="text-primary"
                title="Trending now"
                onSeeAll={() => setExpanded("trending")}
              />
              <div className="rounded-3xl bg-primary/5 p-3">
                <Rail className="!mx-0 !px-0 lg:grid lg:grid-cols-4">
                  {trending.map((plan) => <TrendingCard key={plan.id} plan={plan} />)}
                </Rail>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- browse by vibe */}
          <section className="mt-7">
            <SectionHeader icon={Heart} iconClass="fill-primary text-primary" title="Browse by vibe" />
            <Rail className="lg:grid lg:grid-cols-4">
              {CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setVibe(category.key)}
                  className={cn(
                    "relative h-[205px] w-[185px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left transition-transform hover:scale-[1.02] lg:w-auto",
                    category.tint,
                  )}
                >
                  <h3 className="text-[15px] font-bold">{category.cardTitle}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{category.blurb}</p>
                  <span className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-primary">
                    {vibeCounts[category.key] ?? 0} plans <ArrowRight className="h-3 w-3" />
                  </span>
                  <category.icon
                    className={cn("absolute -bottom-3 -right-2 h-24 w-24 opacity-40", category.iconClass)}
                    strokeWidth={1.25}
                  />
                </button>
              ))}
            </Rail>
          </section>

          {/* ----------------------------------------------------- upcoming plans */}
          {upcoming.length > 0 && (
            <section className="mt-7">
              <SectionHeader
                icon={CalendarDays}
                iconClass="text-primary"
                title="Upcoming plans"
                onSeeAll={() => setExpanded("upcoming")}
              />
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((plan) => <UpcomingRow key={plan.id} plan={plan} />)}
              </div>
            </section>
          )}

          {destinations.length === 0 && trending.length === 0 && upcoming.length === 0 && (
            <div className="mt-6 rounded-3xl border border-border bg-card py-16 text-center">
              <Compass className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nothing to explore yet</h3>
              <p className="mt-1 px-6 text-sm text-muted-foreground">
                Post the first plan and this page fills up with places and vibes.
              </p>
              <Button variant="gradient" size="sm" className="mt-5" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Create a new plan
              </Button>
            </div>
          )}
        </>
      ) : (
        /* ------------------------------------------------------- result list */
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">
              {expanded ? expandedTitle : vibe !== "all" ? categoryByKey(vibe).cardTitle : "Results"}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {expanded === "destinations" ? destinations.length : results.length}
              </span>
            </h2>
            <button onClick={resetView} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <ChevronLeft className="h-4 w-4" /> Back to explore
            </button>
          </div>

          {expanded === "destinations" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {destinations.map((destination, i) => (
                <DestinationCard
                  key={destination.key}
                  destination={destination}
                  trending={i === 0}
                  onSelect={() => { setExpanded(null); setQuery(destination.location); }}
                />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card py-16 text-center">
              <Compass className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{savedOnly ? "Nothing saved yet" : "No plans here"}</h3>
              <p className="mt-1 px-6 text-sm text-muted-foreground">
                {savedOnly
                  ? "Tap the bookmark on any plan to keep it here."
                  : "Try another vibe, or start something yourself."}
              </p>
              {!savedOnly && (
                <Button variant="gradient" size="sm" className="mt-5" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Create a new plan
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {results.map((plan, i) => <PlanCard key={plan.id} plan={plan} index={i} />)}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;
