import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MiniProfile = { id: string; display_name: string | null; avatar_url: string | null };
export type Participant = { user_id: string; profile: MiniProfile | null };

export type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  maps_url: string | null;
  plan_time: string | null;
  max_participants: number;
  created_at: string;
  /** Uploaded image URL or "preset:<vibe>"; null until 0009_plan_cover.sql runs. */
  cover_url?: string | null;
  profile?: MiniProfile | null;
  /** Host's follower count, for the trust badge on the card. */
  host_followers?: number;
  participants: Participant[];
};

type PlansContextValue = {
  plans: Plan[];
  loading: boolean;
  /** Every profile referenced by the feed, keyed by user id. */
  profiles: Record<string, MiniProfile>;
  /** Follower count per referenced user id, for trust scores. */
  followerCounts: Record<string, number>;
  refetch: (silent?: boolean) => Promise<void>;
  toggleJoin: (plan: Plan) => Promise<void>;
  deletePlan: (plan: Plan) => Promise<void>;
  isJoined: (plan: Plan) => boolean;
};

const PlansContext = createContext<PlansContextValue | undefined>(undefined);

/**
 * Loads the plan feed once for the whole signed-in app and keeps it live via
 * Supabase realtime, so switching tabs doesn't refetch or flash a skeleton.
 */
export const PlansProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // `silent` refetches (from realtime) don't flash the skeleton loader.
  const refetch = useCallback(async (silent = false) => {
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
        : { data: [] as MiniProfile[] };
      const profById: Record<string, MiniProfile> = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));

      // Follower counts for everyone in the feed, tallied in one round trip so
      // each card can show its host's trust score.
      const { data: follows } = ids.length
        ? await supabase.from("follows").select("following_id").in("following_id", ids)
        : { data: [] as { following_id: string }[] };
      const followersById: Record<string, number> = {};
      for (const id of ids) followersById[id] = 0;
      for (const f of follows ?? []) followersById[f.following_id] = (followersById[f.following_id] ?? 0) + 1;

      setProfiles(profById);
      setFollowerCounts(followersById);
      setPlans((rows ?? []).map((p) => ({
        ...p,
        participants: (parts ?? [])
          .filter((pp) => pp.plan_id === p.id)
          .map((pp) => ({ user_id: pp.user_id, profile: profById[pp.user_id] ?? null })),
        profile: profById[p.user_id] ?? null,
        host_followers: followersById[p.user_id] ?? 0,
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refetch();
  }, [user, refetch]);

  // ---- Realtime: live-refresh the feed on any plan/participant change ----
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("plans-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, () => refetch(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_participants" }, () => refetch(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  const isJoined = useCallback(
    (plan: Plan) => !!user && plan.participants.some((p) => p.user_id === user.id),
    [user],
  );

  const toggleJoin = useCallback(async (plan: Plan) => {
    if (!user) return;
    const joined = plan.participants.some((p) => p.user_id === user.id);
    try {
      if (joined) {
        const { error } = await supabase
          .from("plan_participants").delete().eq("plan_id", plan.id).eq("user_id", user.id);
        if (error) throw error;
        toast.success("Left the plan");
      } else {
        if (plan.participants.length >= plan.max_participants) {
          toast.error("Plan is full");
          return;
        }
        const { error } = await supabase
          .from("plan_participants").insert({ plan_id: plan.id, user_id: user.id });
        if (error) throw error;
        toast.success("You're in! 🎉");
      }
      refetch(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [user, refetch]);

  const deletePlan = useCallback(async (plan: Plan) => {
    try {
      const { error } = await supabase.from("plans").delete().eq("id", plan.id);
      if (error) throw error;
      toast.success("Plan deleted");
      refetch(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete plan");
    }
  }, [refetch]);

  return (
    <PlansContext.Provider
      value={{ plans, loading, profiles, followerCounts, refetch, toggleJoin, deletePlan, isJoined }}
    >
      {children}
    </PlansContext.Provider>
  );
};

export const usePlans = () => {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error("usePlans must be used within PlansProvider");
  return ctx;
};
