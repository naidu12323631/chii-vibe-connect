import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreatePlan } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { usePlans } from "@/hooks/usePlans";
import { supabase } from "@/integrations/supabase/client";
import { categoryOf, timeAgo } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

type LastMessage = { content: string; created_at: string; user_id: string };

/**
 * Your conversations: one row per plan you're in (chat lives on the plan page),
 * plus a shortcut into the random stranger chat.
 */
const Chats = () => {
  const { user } = useAuth();
  const { plans, loading, profiles } = usePlans();
  const openCreate = useCreatePlan();
  const [lastByPlan, setLastByPlan] = useState<Record<string, LastMessage>>({});

  const myPlans = useMemo(
    () => plans.filter((p) => p.user_id === user?.id || p.participants.some((pp) => pp.user_id === user?.id)),
    [plans, user],
  );

  const planIds = useMemo(() => myPlans.map((p) => p.id), [myPlans]);
  const planIdKey = planIds.join(",");

  const loadPreviews = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setLastByPlan({});
      return;
    }
    const { data, error } = await supabase
      .from("plan_messages")
      .select("plan_id, content, created_at, user_id")
      .in("plan_id", ids)
      .order("created_at", { ascending: false });
    if (error) return; // preview text is optional — the list still works without it
    const latest: Record<string, LastMessage> = {};
    for (const m of data ?? []) {
      if (!latest[m.plan_id]) latest[m.plan_id] = { content: m.content, created_at: m.created_at, user_id: m.user_id };
    }
    setLastByPlan(latest);
  }, []);

  useEffect(() => {
    loadPreviews(planIdKey ? planIdKey.split(",") : []);
  }, [planIdKey, loadPreviews]);

  // Keep previews fresh as messages arrive.
  useEffect(() => {
    if (!user || planIds.length === 0) return;
    const channel = supabase
      .channel("chats-previews")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "plan_messages" }, () => loadPreviews(planIds))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, planIdKey, loadPreviews]);

  // Busiest conversations first, then newest plans.
  const conversations = useMemo(
    () =>
      [...myPlans].sort((a, b) => {
        const at = lastByPlan[a.id]?.created_at ?? a.created_at;
        const bt = lastByPlan[b.id]?.created_at ?? b.created_at;
        return new Date(bt).getTime() - new Date(at).getTime();
      }),
    [myPlans, lastByPlan],
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <MessageCircle className="h-6 w-6 text-primary" /> Chats
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Talk to the people in your plans, or meet someone new.</p>

      {/* --------------------------------------------------------- new chat CTA */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          to="/chat"
          className="gradient-primary shadow-glow flex items-center gap-3 rounded-3xl px-4 py-4 text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Video className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold">Start a new chat</span>
            <span className="block text-sm text-primary-foreground/80">Meet someone random</span>
          </span>
        </Link>
        <button
          onClick={openCreate}
          className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Plus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold">Create a new plan</span>
            <span className="block text-sm text-muted-foreground">Start a group chat with it</span>
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------- conversations */}
      <h2 className="mb-3 mt-7 text-base font-bold">Your plan chats</h2>
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading chats…</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card py-16 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No plan chats yet</h3>
          <p className="mt-1 px-6 text-sm text-muted-foreground">
            Join a plan and its group chat shows up here.
          </p>
          <Button variant="gradient" size="sm" className="mt-5" asChild>
            <Link to="/app">Browse plans</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((plan) => {
            const category = categoryOf(plan);
            const last = lastByPlan[plan.id];
            const senderName = last
              ? last.user_id === user?.id
                ? "You"
                : profiles[last.user_id]?.display_name ?? "Someone"
              : null;
            return (
              <li key={plan.id}>
                <Link
                  to={`/plans/${plan.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
                >
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white", category.cover)}>
                    <category.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold">{plan.title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(last?.created_at ?? plan.created_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {last ? `${senderName}: ${last.content}` : "No messages yet — say hi 👋"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {plan.participants.length + 1}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Chats;
