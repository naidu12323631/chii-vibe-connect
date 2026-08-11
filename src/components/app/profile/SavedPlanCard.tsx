import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import CoverImage, { slugify } from "@/components/app/CoverImage";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import type { Plan } from "@/hooks/usePlans";
import { categoryOf } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

/** Compact card in the "Saved plans" rail, with a tappable bookmark. */
const SavedPlanCard = ({ plan }: { plan: Plan }) => {
  const { isSaved, toggleSaved } = useSavedPlans();
  const category = categoryOf(plan);
  const saved = isSaved(plan.id);

  return (
    <div className="w-[160px] shrink-0 snap-start lg:w-auto">
      <div className="relative">
        <Link to={`/plans/${plan.id}`}>
          <CoverImage
            slug={slugify(plan.title)}
            category={category}
            coverUrl={plan.cover_url}
            className="h-[110px] w-full rounded-2xl"
          />
        </Link>
        <button
          onClick={() => toggleSaved(plan.id)}
          aria-label={saved ? "Remove from saved" : "Save plan"}
          aria-pressed={saved}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background"
        >
          <Bookmark className={cn("h-4 w-4", saved ? "fill-primary text-primary" : "text-foreground")} />
        </button>
      </div>
      <Link to={`/plans/${plan.id}`} className="mt-2 block">
        <h4 className="truncate text-[14px] font-bold hover:text-primary">{plan.title}</h4>
        <p className="truncate text-[12px] text-muted-foreground">{plan.location ?? "Anywhere"}</p>
      </Link>
    </div>
  );
};

export default SavedPlanCard;
