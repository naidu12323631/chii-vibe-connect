import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlignLeft, ArrowLeft, Bookmark, Calendar, ChevronRight, Link2, Loader2, Map,
  MapPin, MessageCircle, MoreHorizontal, Share2, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PlanChat from "@/components/PlanChat";
import AvatarImg from "@/components/AvatarImg";
import TrustBadge from "@/components/TrustBadge";
import CoverImage, { slugify } from "@/components/app/CoverImage";
import HostCard from "@/components/app/plan/HostCard";
import PeopleGoing from "@/components/app/plan/PeopleGoing";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import { supabase } from "@/integrations/supabase/client";
import { categoryOf, formatWhen, mapsLinkFor, startsInLabel } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

type Profile = { id: string; display_name: string | null; avatar_url: string | null; bio: string | null };
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
  cover_url?: string | null;
};

/** How far a horizontal drag must travel to count as a swipe between plans. */
const SWIPE_DISTANCE = 90;
/** …or how fast it has to be flicked. */
const SWIPE_VELOCITY = 450;

// One row of the details card: icon tile, label + value, optional trailing slot.
const Row = ({
  icon: Icon,
  label,
  children,
  trailing,
  last,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  last?: boolean;
}) => (
  <div className={cn("flex items-center gap-3 py-3.5", !last && "border-b border-border/70")}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </span>
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-semibold">{label}</div>
      <div className="text-[13px] text-muted-foreground">{children}</div>
    </div>
    {trailing}
  </div>
);

const PlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedPlans();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);
  /** Follower count per user id, for the trust badges. */
  const [followers, setFollowers] = useState<Record<string, number>>({});
  const [hostedCount, setHostedCount] = useState(0);
  const [feedIds, setFeedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Direction of the last swipe, so the new plan slides in from that side. */
  const [swipe, setSwipe] = useState(0);
  const chatRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  // No setLoading(true) here: swiping to a neighbouring plan keeps the current
  // one on screen until its replacement is ready, instead of flashing a spinner.
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data: planData, error } = await supabase.from("plans").select("*").eq("id", id).single();
      if (error) throw error;

      const { data: parts } = await supabase
        .from("plan_participants").select("user_id").eq("plan_id", id);
      const partIds = (parts ?? []).map((p) => p.user_id);
      const allIds = [...new Set([planData.user_id, ...partIds])];

      const [{ data: profs }, { data: follows }, { count: hosted }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, bio").in("id", allIds),
        // One tally for the host and everyone going, for their trust scores.
        supabase.from("follows").select("following_id").in("following_id", allIds),
        supabase.from("plans").select("*", { count: "exact", head: true }).eq("user_id", planData.user_id),
      ]);

      const byId: Record<string, Profile> = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      const blank = (pid: string): Profile => ({ id: pid, display_name: null, avatar_url: null, bio: null });
      const counts: Record<string, number> = Object.fromEntries(allIds.map((uid) => [uid, 0]));
      for (const f of follows ?? []) counts[f.following_id] = (counts[f.following_id] ?? 0) + 1;

      setPlan(planData);
      setHost(byId[planData.user_id] ?? blank(planData.user_id));
      setParticipants(partIds.map((pid) => byId[pid] ?? blank(pid)));
      setFollowers(counts);
      setHostedCount(hosted ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  // Feed order, so swiping moves through plans exactly as the home list shows them.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("plans").select("id").order("created_at", { ascending: false })
      .then(({ data }) => setFeedIds((data ?? []).map((p) => p.id)));
  }, [user]);

  const joined = !!user && participants.some((p) => p.id === user.id);
  const isOwner = !!user && plan?.user_id === user.id;
  const full = !!plan && participants.length >= plan.max_participants;
  const spotsLeft = plan ? Math.max(0, plan.max_participants - participants.length) : 0;
  const category = useMemo(
    () => categoryOf({ title: plan?.title ?? "", description: plan?.description }),
    [plan?.title, plan?.description],
  );
  const mapsHref = plan ? mapsLinkFor(plan) : null;

  // ------------------------------------------------------------------ swiping
  const step = useCallback((delta: number) => {
    if (!id || feedIds.length < 2) return;
    const at = feedIds.indexOf(id);
    if (at === -1) return;
    const next = feedIds[(at + delta + feedIds.length) % feedIds.length];
    if (!next || next === id) return;
    setSwipe(delta);
    navigate(`/plans/${next}`);
  }, [feedIds, id, navigate]);

  // Arrow keys mirror the swipe on desktop — but not while typing in the chat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.isContentEditable || (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const toggleJoin = async () => {
    if (!user || !plan) return;
    setActing(true);
    try {
      if (joined) {
        const { error } = await supabase
          .from("plan_participants").delete().eq("plan_id", plan.id).eq("user_id", user.id);
        if (error) throw error;
        toast.success("Left the plan");
      } else {
        if (full) { setActing(false); return toast.error("Plan is full"); }
        const { error } = await supabase
          .from("plan_participants").insert({ plan_id: plan.id, user_id: user.id });
        if (error) throw error;
        toast.success("You're in! 🎉");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  };

  // Host-only: remove someone from the plan.
  const removeParticipant = async (pid: string) => {
    if (!plan) return;
    try {
      const { error } = await supabase
        .from("plan_participants").delete().eq("plan_id", plan.id).eq("user_id", pid);
      if (error) throw error;
      toast.success("Participant removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove participant");
    }
  };

  const share = async () => {
    if (!plan) return;
    const url = `${window.location.origin}/plans/${plan.id}`;
    try {
      if (navigator.share) await navigator.share({ title: plan.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* dismissed share sheet — nothing to report */
    }
  };

  // The chat is the only way to reach the host, so "Message host" goes there.
  const messageHost = () => {
    if (!canChat) return toast.info("Join the plan to chat with the host");
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deletePlan = async () => {
    if (!plan) return;
    const { error } = await supabase.from("plans").delete().eq("id", plan.id);
    if (error) return toast.error(error.message);
    toast.success("Plan deleted");
    navigate("/app");
  };

  if (authLoading || !user || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This plan doesn't exist.</p>
        <Button variant="gradient" onClick={() => navigate("/app")}>Back to plans</Button>
      </div>
    );
  }

  const saved = isSaved(plan.id);
  const hostName = host?.display_name ?? "Someone";
  const canChat = isOwner || joined;

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      {/* ------------------------------------------------------------- top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-lg">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={share} aria-label="Share plan" className="rounded-full p-2.5 hover:bg-accent">
            <Share2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleSaved(plan.id)}
            aria-label={saved ? "Remove from saved" : "Save plan"}
            aria-pressed={saved}
            className="rounded-full p-2.5 hover:bg-accent"
          >
            <Bookmark className={cn("h-5 w-5", saved && "fill-primary text-primary")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More options" className="rounded-full p-2.5 hover:bg-accent">
              <MoreHorizontal className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="app-theme w-48">
              <DropdownMenuItem onClick={share}><Link2 className="mr-2 h-4 w-4" /> Copy link</DropdownMenuItem>
              {mapsHref && (
                <DropdownMenuItem asChild>
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-2 h-4 w-4" /> Open in Maps
                  </a>
                </DropdownMenuItem>
              )}
              {feedIds.length > 1 && (
                <DropdownMenuItem onClick={() => step(1)}>
                  <ChevronRight className="mr-2 h-4 w-4" /> Next plan
                </DropdownMenuItem>
              )}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete plan
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Swipe left/right (or arrow keys) to move through the feed. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={plan.id}
          drag={feedIds.length > 1 ? "x" : false}
          dragDirectionLock
          dragElastic={0.12}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            // Distance or a quick flick both commit to the neighbouring plan.
            if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) step(1);
            else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) step(-1);
          }}
          initial={{ opacity: 0, x: swipe * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: swipe * -40 }}
          transition={{ duration: 0.2 }}
          className="mx-auto w-full max-w-2xl touch-pan-y px-4 pt-4"
        >
          {/* --------------------------------------------------------- headline */}
          <div className="flex gap-4">
            <CoverImage
              slug={slugify(plan.title)}
              category={category}
              coverUrl={plan.cover_url}
              className="h-[120px] w-[120px] shrink-0 rounded-3xl"
              iconClassName="h-8 w-8"
            />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <category.icon className="h-3.5 w-3.5" /> {category.label}
              </span>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight">{plan.title}</h1>
            </div>
          </div>

          {/* ------------------------------------------------------- hosted by */}
          <div className="mt-4 flex items-center gap-3">
            <Link
              to={isOwner ? "/profile" : `/u/${plan.user_id}`}
              className="h-11 w-11 shrink-0 overflow-hidden rounded-full"
            >
              <AvatarImg url={host?.avatar_url} name={hostName} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-muted-foreground">Hosted by</div>
              <div className="flex items-center gap-2">
                <Link
                  to={isOwner ? "/profile" : `/u/${plan.user_id}`}
                  className="truncate font-semibold hover:text-primary"
                >
                  {hostName}
                </Link>
                <TrustBadge followers={followers[plan.user_id]} size="sm" />
              </div>
            </div>
            {!isOwner && (
              // Milo has no DMs — the conversation for a plan is its own chat.
              <Button variant="outline" size="sm" className="shrink-0" onClick={messageHost}>
                <MessageCircle className="h-4 w-4" /> Message host
              </Button>
            )}
          </div>

          {/* ---------------------------------------------- details (given data) */}
          <div className="mt-4 rounded-3xl border border-border bg-card px-4 shadow-sm">
            {plan.plan_time && (
              <Row
                icon={Calendar}
                label="Date & Time"
                trailing={
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    {startsInLabel(plan.plan_time)}
                  </span>
                }
              >
                {formatWhen(plan.plan_time)}
              </Row>
            )}

            {plan.location && (
              <Row
                icon={MapPin}
                label="Location"
                trailing={
                  mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      <Map className="h-3.5 w-3.5" /> View on map
                    </a>
                  ) : undefined
                }
              >
                {plan.location}
              </Row>
            )}

            <Row
              icon={Users}
              label="Spots"
              trailing={
                <div className="flex shrink-0 items-center gap-1">
                  <div className="flex -space-x-2">
                    {participants.slice(0, 3).map((p) => (
                      <div key={p.id} className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-card">
                        <AvatarImg url={p.avatar_url} name={p.display_name} textClassName="text-[10px]" />
                      </div>
                    ))}
                  </div>
                  {participants.length > 3 && (
                    <span className="text-xs font-semibold text-muted-foreground">+{participants.length - 3}</span>
                  )}
                </div>
              }
            >
              {participants.length} / {plan.max_participants} going
            </Row>

            {plan.description && (
              <Row icon={AlignLeft} label="About this plan" last>
                <span className="whitespace-pre-line">{plan.description}</span>
              </Row>
            )}
          </div>

          {/* ------------------------------------------------------ about host --
              No reviews in milo, so credibility reads as trust % + plans hosted. */}
          <h2 className="mt-7 border-l-4 border-primary pl-3 text-base font-bold">About the host</h2>
          <div className="mt-3">
            <HostCard
              host={{
                id: plan.user_id,
                display_name: host?.display_name ?? null,
                avatar_url: host?.avatar_url ?? null,
                bio: host?.bio ?? null,
                plansHosted: hostedCount,
                followers: followers[plan.user_id] ?? 0,
              }}
              isYou={!!isOwner}
            />
          </div>

          {/* ---------------------------------------------------- people going */}
          <h2 className="mt-7 border-l-4 border-primary pl-3 text-base font-bold">
            People going{" "}
            <span className="font-medium text-muted-foreground">({participants.length}/{plan.max_participants})</span>
          </h2>
          <div className="mt-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <PeopleGoing
              host={{
                id: plan.user_id,
                display_name: host?.display_name ?? null,
                avatar_url: host?.avatar_url ?? null,
                followers: followers[plan.user_id] ?? 0,
              }}
              participants={participants.map((p) => ({
                id: p.id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
                followers: followers[p.id] ?? 0,
              }))}
              openSpots={Math.min(spotsLeft, 6)}
              currentUserId={user.id}
              canRemove={!!isOwner}
              onRemove={removeParticipant}
              onJoin={!isOwner && !joined && !full ? toggleJoin : undefined}
            />
          </div>

          {/* ----------------------------------------------------------- chat --
              Its own pointer handler so selecting text never starts a swipe. */}
          <h2 ref={chatRef} className="mt-7 scroll-mt-20 border-l-4 border-primary pl-3 text-base font-bold">
            Plan chat
          </h2>
          <div
            className="mt-3 rounded-3xl border border-border bg-card p-4 shadow-sm"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <PlanChat
              planId={plan.id}
              currentUserId={user.id}
              canChat={canChat}
              profilesById={Object.fromEntries(
                [...(host ? [[host.id, host]] : []), ...participants.map((p) => [p.id, p])] as [string, Profile][],
              )}
            />
          </div>
        </motion.main>
      </AnimatePresence>

      {/* --------------------------------------------------------- action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={share}
            aria-label="Share plan"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border"
          >
            <Share2 className="h-5 w-5" />
          </button>
          {isOwner ? (
            <Button variant="outline" size="lg" className="h-12 flex-1 rounded-2xl" onClick={() => navigate("/profile")}>
              You're hosting · {participants.length}/{plan.max_participants} going
            </Button>
          ) : (
            <Button
              variant={joined ? "outline" : "gradient"}
              size="lg"
              className="h-12 flex-1 flex-col gap-0 rounded-2xl leading-tight"
              onClick={toggleJoin}
              disabled={acting || (!joined && full)}
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="font-semibold">{joined ? "Leave plan" : full ? "Plan is full" : "Join plan"}</span>
                  {!joined && !full && (
                    <span className="text-[11px] font-normal opacity-90">
                      {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                    </span>
                  )}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="app-theme">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              “{plan.title}” and its chat will be removed for everyone. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deletePlan}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanDetail;
