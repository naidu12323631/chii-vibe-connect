import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2, MapPin, Calendar, Users, Plus, LogOut, Sparkles, ArrowRight,
  Search, Clock, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import NotificationsBell from "@/components/NotificationsBell";
import AvatarImg from "@/components/AvatarImg";

type MiniProfile = { display_name: string | null; avatar_url: string | null };
type Participant = { user_id: string; profile: MiniProfile | null };
type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  maps_url: string | null;
  plan_time: string | null;
  max_participants: number;
  created_at: string;
  profile?: MiniProfile | null;
  participants: Participant[];
};

// "just now", "5m ago", "3h ago", "2d ago"
const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Is the plan happening within the next 24 hours?
const isSoon = (iso: string | null) => {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
};

// Overlapping stack of participant avatars.
const AvatarStack = ({ participants }: { participants: Participant[] }) => (
  <div className="flex -space-x-2">
    {participants.slice(0, 4).map((p) => (
      <div key={p.user_id} className="h-6 w-6 overflow-hidden rounded-full ring-2 ring-card">
        <AvatarImg url={p.profile?.avatar_url} name={p.profile?.display_name} />
      </div>
    ))}
    {participants.length > 4 && (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-card">
        +{participants.length - 4}
      </div>
    )}
  </div>
);

const PlanSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-border bg-card p-6">
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

const Plans = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(0);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  // `silent` refetches (from realtime) don't flash the skeleton loader.
  const fetchPlans = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: parts } = await supabase.from("plan_participants").select("plan_id, user_id");

      // Fetch every referenced profile once (creators + participants) for avatars.
      const ids = [...new Set([
        ...(rows ?? []).map((p) => p.user_id),
        ...(parts ?? []).map((pp) => pp.user_id),
      ])];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids)
        : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };
      const profById = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));

      const assembled: Plan[] = (rows ?? []).map((p) => ({
        ...p,
        participants: (parts ?? [])
          .filter((pp) => pp.plan_id === p.id)
          .map((pp) => ({ user_id: pp.user_id, profile: profById[pp.user_id] ?? null })),
        profile: profById[p.user_id] ?? null,
      }));
      setPlans(assembled);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchPlans();
  }, [user, fetchPlans]);

  // ---- Realtime: live-refresh the feed on any plan/participant change ----
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("plans-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, () => fetchPlans(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_participants" }, () => fetchPlans(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPlans]);

  // ---- Presence: how many people are viewing the app right now ----
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("app-online", { config: { presence: { key: user.id } } });
    const refresh = () => setOnline(Object.keys(ch.presenceState()).length);
    ch.on("presence", { event: "sync" }, refresh)
      .subscribe(async (st) => { if (st === "SUBSCRIBED") await ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("You must be signed in to post a plan."); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("plans")
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          location: location || null,
          maps_url: mapsUrl.trim() || null,
          plan_time: planTime ? new Date(planTime).toISOString() : null,
          max_participants: maxParticipants,
        })
        .select()
        .single();
      if (error) throw error;
      console.info("[plans] stored plan:", data);
      toast.success("Plan posted!");
      setOpen(false);
      setTitle(""); setDescription(""); setLocation(""); setMapsUrl(""); setPlanTime(""); setMaxParticipants(4);
      fetchPlans();
    } catch (err) {
      console.error("[plans] insert failed:", err);
      const e = err as { code?: string; message?: string };
      let msg = e.message ?? "Could not post plan";
      if (e.code === "42P01" || /relation .*plans.* does not exist/i.test(msg)) {
        msg = "The 'plans' table doesn't exist yet. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor.";
      } else if (e.code === "42501" || /row-level security/i.test(msg)) {
        msg = "Blocked by row-level security — make sure you're signed in.";
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (plan: Plan) => {
    if (!user) return;
    const joined = plan.participants.some((p) => p.user_id === user.id);
    try {
      if (joined) {
        const { error } = await supabase.from("plan_participants").delete().eq("plan_id", plan.id).eq("user_id", user.id);
        if (error) throw error;
        toast.success("Left the plan");
      } else {
        if (plan.participants.length >= plan.max_participants) return toast.error("Plan is full");
        const { error } = await supabase.from("plan_participants").insert({ plan_id: plan.id, user_id: user.id });
        if (error) throw error;
        toast.success("You're in! 🎉");
      }
      fetchPlans(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) =>
      [p.title, p.description, p.location, p.profile?.display_name]
        .some((f) => f?.toLowerCase().includes(q)),
    );
  }, [plans, query]);

  if (authLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* nav */}
      <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/app" className="text-xl font-extrabold tracking-tight"><span className="text-gradient">chillout</span></Link>
          <div className="flex items-center gap-2">
            <Link to="/chat" className="mr-2 hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline">Video chat</Link>
            <NotificationsBell />
            <Link to="/profile" className="h-9 w-9 overflow-hidden rounded-full hover:opacity-90">
              <AvatarImg url={user.avatar_url} name={user.display_name ?? user.email} />
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-3xl px-6 py-8">
        {/* hero */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <Radio className="h-3 w-3" /> Live · {online} online
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Hey {user.display_name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">Post a hangout or join one happening near you.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="lg" className="shrink-0"><Plus className="h-4 w-4" /> Post plan</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Post a new plan</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="mt-2 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Coffee & co-work ☕" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are we doing? Who's invited?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="loc">Location</Label>
                    <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Brooklyn, NY" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">When</Label>
                    <Input id="time" type="datetime-local" value={planTime} onChange={(e) => setPlanTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maps">Google Maps link <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="maps"
                    type="url"
                    inputMode="url"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                  <p className="text-xs text-muted-foreground">Paste a share link from Google Maps so people can find the spot.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Max participants</Label>
                  <Input id="max" type="number" min={2} max={50} value={maxParticipants} onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 2)} />
                </div>
                <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post plan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans, places, people..."
            className="h-11 rounded-xl pl-10"
          />
        </div>

        {/* feed */}
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <PlanSkeleton key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card py-20 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{query ? "No matches" : "No plans yet"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? "Try a different search." : "Be the first to post something fun."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filtered.map((plan, i) => {
                const joined = plan.participants.some((p) => p.user_id === user.id);
                const isOwner = plan.user_id === user.id;
                const count = plan.participants.length;
                const full = count >= plan.max_participants;
                const pct = Math.min(100, Math.round((count / plan.max_participants) * 100));
                return (
                  <motion.div
                    key={plan.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
                    className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg"
                  >
                    <div className="flex cursor-pointer items-start gap-4" onClick={() => navigate(`/plans/${plan.id}`)}>
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
                        <AvatarImg url={plan.profile?.avatar_url} name={plan.profile?.display_name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Link
                            to={isOwner ? "/profile" : `/u/${plan.user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {plan.profile?.display_name ?? "Someone"}
                          </Link>
                          {isOwner && <span className="rounded-full bg-accent px-2 py-0.5 text-xs">you</span>}
                          <span className="text-xs">· {timeAgo(plan.created_at)}</span>
                          {isSoon(plan.plan_time) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              <Clock className="h-3 w-3" /> Soon
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 text-lg font-bold">{plan.title}</h3>
                        {plan.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          {plan.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {plan.location}</span>}
                          {plan.plan_time && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(plan.plan_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>}
                          {plan.maps_url && (
                            <a
                              href={plan.maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Map
                            </a>
                          )}
                        </div>

                        {/* capacity */}
                        <div className="mt-4 flex items-center gap-3">
                          {count > 0 ? <AvatarStack participants={plan.participants} /> : null}
                          <div className="flex-1">
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {count}/{plan.max_participants} going</span>
                              <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">View <ArrowRight className="inline h-3 w-3" /></span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isOwner && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant={joined ? "outline" : "gradient"}
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleJoin(plan); }}
                          disabled={!joined && full}
                        >
                          {joined ? "Leave" : full ? "Full" : "Join plan"}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
