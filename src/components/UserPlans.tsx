import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PlanRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  plan_time: string | null;
  max_participants: number;
  created_at: string;
  count: number;
};

// The plans a user has created, shown as cards on their profile.
const UserPlans = ({ userId }: { userId: string }) => {
  const [plans, setPlans] = useState<PlanRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const ids = (rows ?? []).map((r) => r.id);
      const { data: parts } = ids.length
        ? await supabase.from("plan_participants").select("plan_id").in("plan_id", ids)
        : { data: [] as { plan_id: string }[] };
      const countBy: Record<string, number> = {};
      (parts ?? []).forEach((p) => { countBy[p.plan_id] = (countBy[p.plan_id] ?? 0) + 1; });
      if (!cancelled) {
        setPlans((rows ?? []).map((r) => ({ ...r, count: countBy[r.id] ?? 0 })));
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (plans === null) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (plans.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm">No plans yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {plans.map((p) => (
        <Link
          key={p.id}
          to={`/plans/${p.id}`}
          className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <h3 className="font-bold">{p.title}</h3>
          {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
            {p.plan_time && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(p.plan_time).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.count}/{p.max_participants}</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default UserPlans;
