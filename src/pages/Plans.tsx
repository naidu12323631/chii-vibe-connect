import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, MapPin, Calendar, Users, Plus, LogOut, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import NotificationsBell from "@/components/NotificationsBell";

type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  plan_time: string | null;
  max_participants: number;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  participants: { user_id: string }[];
};

const Plans = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plans")
      .select("*, participants:plan_participants(user_id)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // fetch profiles for plan creators
    const userIds = Array.from(new Set((data ?? []).map((p) => p.user_id)));
    let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      profilesById = Object.fromEntries((profs ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]));
    }
    setPlans((data ?? []).map((p) => ({ ...p, profile: profilesById[p.user_id] ?? null })) as Plan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchPlans();
  }, [user, fetchPlans]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("plans").insert({
      user_id: user.id,
      title,
      description: description || null,
      location: location || null,
      plan_time: planTime ? new Date(planTime).toISOString() : null,
      max_participants: maxParticipants,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Plan posted!");
    setOpen(false);
    setTitle(""); setDescription(""); setLocation(""); setPlanTime(""); setMaxParticipants(4);
    fetchPlans();
  };

  const handleJoin = async (plan: Plan) => {
    if (!user) return;
    const joined = plan.participants.some((p) => p.user_id === user.id);
    if (joined) {
      const { error } = await supabase.from("plan_participants").delete()
        .eq("plan_id", plan.id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast.success("Left the plan");
    } else {
      if (plan.participants.length >= plan.max_participants) return toast.error("Plan is full");
      const { error } = await supabase.from("plan_participants").insert({ plan_id: plan.id, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("You're in! 🎉");
    }
    fetchPlans();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
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
            <Link to="/profile" className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm hover:opacity-90">
              {initial}
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">What's the plan?</h1>
            <p className="text-muted-foreground mt-1">Post a hangout or join one nearby.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="lg"><Plus className="h-4 w-4" /> Post plan</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Post a new plan</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
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

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-3xl">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">No plans yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Be the first to post something fun.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan, i) => {
              const joined = plan.participants.some((p) => p.user_id === user.id);
              const isOwner = plan.user_id === user.id;
              const full = plan.participants.length >= plan.max_participants;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4 cursor-pointer" onClick={() => navigate(`/plans/${plan.id}`)}>
                    <div className="h-11 w-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                      {(plan.profile?.display_name ?? "U")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{plan.profile?.display_name ?? "Someone"}</span>
                        {isOwner && <span className="text-xs px-2 py-0.5 rounded-full bg-accent">you</span>}
                      </div>
                      <h3 className="text-lg font-bold mt-1">{plan.title}</h3>
                      {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
                        {plan.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {plan.location}</span>}
                        {plan.plan_time && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(plan.plan_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {plan.participants.length}/{plan.max_participants}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <span className="text-xs font-medium text-primary flex items-center gap-1">View details <ArrowRight className="h-3 w-3" /></span>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
