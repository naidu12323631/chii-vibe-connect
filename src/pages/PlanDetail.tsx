import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Loader2, LogOut, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PlanChat from "@/components/PlanChat";

type Profile = { id: string; display_name: string | null; avatar_url: string | null; bio: string | null };
type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  plan_time: string | null;
  max_participants: number;
  created_at: string;
};

const Avatar = ({ name, url, size = "md" }: { name: string | null; url?: string | null; size?: "md" | "lg" }) => {
  const cls = size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  const initial = (name ?? "U")[0]?.toUpperCase();
  return url ? (
    <img src={url} alt={name ?? "user"} className={`${cls} rounded-full object-cover`} />
  ) : (
    <div className={`${cls} rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0`}>
      {initial}
    </div>
  );
};

const PlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: planData, error } = await supabase.from("plans").select("*").eq("id", id).maybeSingle();
    if (error || !planData) {
      toast.error(error?.message ?? "Plan not found");
      setLoading(false);
      return;
    }
    setPlan(planData as Plan);

    const { data: parts } = await supabase.from("plan_participants").select("user_id").eq("plan_id", id);
    const partIds = (parts ?? []).map((p) => p.user_id);
    const allIds = Array.from(new Set([planData.user_id, ...partIds]));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio")
      .in("id", allIds);
    const byId: Record<string, Profile> = Object.fromEntries((profs ?? []).map((p) => [p.id, p as Profile]));
    setHost(byId[planData.user_id] ?? { id: planData.user_id, display_name: null, avatar_url: null, bio: null });
    setParticipants(partIds.map((pid) => byId[pid] ?? { id: pid, display_name: null, avatar_url: null, bio: null }));
    setLoading(false);
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const joined = !!user && participants.some((p) => p.id === user.id);
  const isOwner = !!user && plan?.user_id === user.id;
  const full = !!plan && participants.length >= plan.max_participants;

  const toggleJoin = async () => {
    if (!user || !plan) return;
    setActing(true);
    if (joined) {
      const { error } = await supabase.from("plan_participants").delete().eq("plan_id", plan.id).eq("user_id", user.id);
      if (error) { setActing(false); return toast.error(error.message); }
      toast.success("Left the plan");
    } else {
      if (full) { setActing(false); return toast.error("Plan is full"); }
      const { error } = await supabase.from("plan_participants").insert({ plan_id: plan.id, user_id: user.id });
      if (error) { setActing(false); return toast.error(error.message); }
      toast.success("You're in! 🎉");
    }
    await load();
    setActing(false);
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (authLoading || !user || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This plan doesn't exist.</p>
        <Button variant="gradient" onClick={() => navigate("/app")}>Back to plans</Button>
      </div>
    );
  }

  const initial = user.user_metadata?.display_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/app" className="text-xl font-extrabold tracking-tight">
            <span className="text-gradient">chillout</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm hover:opacity-90">{initial}</Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-3xl p-8 shadow-sm"
        >
          <h1 className="text-3xl font-extrabold tracking-tight">{plan.title}</h1>
          {plan.description && <p className="text-muted-foreground mt-3 whitespace-pre-wrap">{plan.description}</p>}

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            {plan.plan_time && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/40">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">When</div>
                  <div className="text-sm font-medium">{new Date(plan.plan_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>
                </div>
              </div>
            )}
            {plan.location && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/40">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Where</div>
                  <div className="text-sm font-medium">{plan.location}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/40 sm:col-span-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Spots</div>
                <div className="text-sm font-medium">{participants.length} / {plan.max_participants} joined</div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Host</h2>
            <div className="flex items-center gap-4">
              <Avatar name={host?.display_name ?? null} url={host?.avatar_url} size="lg" />
              <div className="min-w-0">
                <div className="font-semibold">{host?.display_name ?? "Someone"}{isOwner && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent font-normal">you</span>}</div>
                {host?.bio && <p className="text-sm text-muted-foreground line-clamp-2">{host.bio}</p>}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Participants ({participants.length})</h2>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has joined yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                    <Avatar name={p.display_name} url={p.avatar_url} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{p.display_name ?? "Member"}{p.id === user.id && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent font-normal">you</span>}</div>
                      {p.bio && <p className="text-xs text-muted-foreground truncate">{p.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isOwner && (
            <Button
              variant={joined ? "outline" : "gradient"}
              size="lg"
              className="w-full mt-8"
              onClick={toggleJoin}
              disabled={acting || (!joined && full)}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : joined ? "Leave plan" : full ? "Plan is full" : "Join plan"}
            </Button>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chat</h2>
            <PlanChat
              planId={plan.id}
              currentUserId={user.id}
              canChat={isOwner || joined}
              profilesById={Object.fromEntries(
                [
                  ...(host ? [[host.id, host]] : []),
                  ...participants.map((p) => [p.id, p]),
                ] as [string, Profile][],
              )}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PlanDetail;
