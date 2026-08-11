import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { categoryOf } from "@/lib/planMeta";
import type { Plan } from "@/hooks/usePlans";
import { cn } from "@/lib/utils";

/**
 * Cover art is a category gradient rather than a photo — plans have no image
 * column, so this stays offline-safe. Swap the block for an <img> if a
 * cover_url is ever added to the table.
 */
const PopularCard = ({ plan }: { plan: Plan }) => {
  const category = categoryOf(plan);
  const going = plan.participants.length;

  return (
    <Link
      to={`/plans/${plan.id}`}
      className="w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:border-primary/30 hover:shadow-lg lg:w-auto"
    >
      <div className={cn("relative h-24 bg-gradient-to-br", category.cover)}>
        <category.icon className="absolute right-3 top-3 h-11 w-11 text-white/25" strokeWidth={1.5} />
        <div className="absolute -bottom-4 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-card ring-2 ring-card">
          <category.icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="px-3 pb-3 pt-5">
        <h4 className="truncate text-sm font-bold">{plan.title}</h4>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          {plan.location ?? "Anywhere"} · <Users className="h-3 w-3" /> {going} going
        </p>
      </div>
    </Link>
  );
};

/** Horizontal rail on phones, a 3-up grid on laptops. */
const PopularStrip = ({ plans }: { plans: Plan[] }) => (
  <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
    {plans.map((plan) => <PopularCard key={plan.id} plan={plan} />)}
  </div>
);

export default PopularStrip;
