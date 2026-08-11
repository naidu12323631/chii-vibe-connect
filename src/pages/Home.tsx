import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ChevronRight, Plus, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AvatarImg from "@/components/AvatarImg";
import HeroArt from "@/components/app/HeroArt";
import PlanCard from "@/components/app/PlanCard";
import PopularStrip from "@/components/app/PopularStrip";
import { useCreatePlan } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { usePlans } from "@/hooks/usePlans";
import { usePresence } from "@/hooks/usePresence";
import { useHomeCity } from "@/hooks/useLocalPrefs";
import { applyFilter, popularPlans, searchPlans, sortPlans } from "@/lib/planFilter";
import { FEED_FILTERS, SORT_OPTIONS, type FeedFilter, type SortKey } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

const PlanSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-border bg-card p-5">
    <div className="flex gap-4">
      <div className="h-11 w-11 rounded-full bg-muted" />
      <div className="flex-1 space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="flex gap-3"><div className="h-3 w-20 rounded bg-muted" /><div className="h-3 w-16 rounded bg-muted" /></div>
      </div>
    </div>
  </div>
);

const SectionHeader = ({ title, to }: { title: string; to?: string }) => (
  <div className="mb-3 flex items-baseline justify-between">
    <h2 className="text-base font-bold">{title}</h2>
    {to && <Link to={to} className="text-sm font-medium text-primary hover:underline">See all</Link>}
  </div>
);

const Home = () => {
  const { user } = useAuth();
  const { plans, loading, profiles } = usePlans();
  const { onlineIds, onlineCount } = usePresence();
  const openCreate = useCreatePlan();
  const { city, setCity } = useHomeCity();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const feed = useMemo(
    () => sortPlans(applyFilter(searchPlans(plans, query), filter, { city, onlineIds }), sort),
    [plans, query, filter, city, onlineIds, sort],
  );
  const popular = useMemo(() => popularPlans(plans), [plans]);

  // Faces for the little presence pill — only users we already have profiles for.
  const onlineFaces = useMemo(
    () => [...onlineIds].map((id) => profiles[id]).filter(Boolean).slice(0, 3),
    [onlineIds, profiles],
  );

  // With a filter or search on, matching plans jump above the extras (popular
// strip) so results sit at the top instead of below the browsing sections.
  const filtering = filter !== "all" || query.trim().length > 0;

  const feedTitle = {
    all: "Nearby plans",
    today: "Happening today",
    week: "This week",
    nearby: city ? `Plans in ${city}` : "Nearby plans",
    online: "Hosts online now",
  }[filter];

  const feedSection = (
    <section className="mt-7">
      <SectionHeader title={feedTitle} to="/explore" />
      {filter === "nearby" && !city && (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing every plan with a place attached — set your city in filters for closer matches.
        </p>
      )}

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <PlanSkeleton key={i} />)}</div>
      ) : feed.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card py-16 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{filtering ? "No matches" : "No plans yet"}</h3>
          <p className="mt-1 px-6 text-sm text-muted-foreground">
            {filtering ? "Try a different search or filter." : "Be the first to post something fun."}
          </p>
          <Button variant="gradient" size="sm" className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create a new plan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {feed.map((plan, i) => <PlanCard key={plan.id} plan={plan} index={i} />)}
          </AnimatePresence>
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative">
        <HeroArt />
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live · {onlineCount} online
          </span>
          {onlineFaces.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-1">
              <span className="flex -space-x-1.5">
                {onlineFaces.map((p) => (
                  <span key={p.id} className="h-5 w-5 overflow-hidden rounded-full ring-2 ring-card">
                    <AvatarImg url={p.avatar_url} name={p.display_name} textClassName="text-[9px]" />
                  </span>
                ))}
              </span>
            </span>
          )}
        </div>

        <h1 className="mt-3 max-w-[62%] text-3xl font-extrabold tracking-tight sm:max-w-[70%] md:text-4xl">
          Hey {user?.display_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1 max-w-[62%] text-sm text-muted-foreground sm:max-w-[70%] sm:text-base">
          Post a hangout or join one happening near you.
        </p>
      </section>

      {/* -------------------------------------------------------- create banner */}
      <button
        onClick={openCreate}
        className="gradient-primary shadow-glow mt-5 flex w-full items-center gap-3 rounded-3xl px-4 py-4 text-left text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Plus className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">Create a new plan</span>
          <span className="block text-sm text-primary-foreground/80">Bring people together</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
      </button>

      {/* --------------------------------------------------------- search + sort */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans, places, people..."
            aria-label="Search plans"
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
            <div className="space-y-2">
              <Label htmlFor="home-city">Your city</Label>
              <Input
                id="home-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangalore"
              />
              <p className="text-xs text-muted-foreground">Used by the “Nearby” filter. Saved on this device.</p>
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

      {/* ---------------------------------------------------------- chip filters */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {FEED_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "gradient-primary border-transparent text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.key === "online" && (
                <span className={cn("h-2 w-2 rounded-full", active ? "bg-white" : "bg-green-500")} />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Results first while filtering, otherwise the usual browse-then-feed order. */}
      {filtering && feedSection}

      {/* -------------------------------------------------------------- popular */}
      {!loading && !filtering && popular.length > 0 && (
        <section className="mt-7">
          <SectionHeader title="Popular right now 🔥" to="/explore" />
          <PopularStrip plans={popular} />
        </section>
      )}

      {!filtering && feedSection}
    </div>
  );
};

export default Home;
