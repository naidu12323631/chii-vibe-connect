import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarDays, Link2, MapPin, MoreHorizontal, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CoverImage, { slugify } from "@/components/app/CoverImage";
import { usePlans, type Plan } from "@/hooks/usePlans";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import { categoryOf, formatWhen } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

/** One row under "Plans created": thumbnail, title + vibe pill, meta, actions. */
const ProfilePlanRow = ({ plan, owned }: { plan: Plan; owned: boolean }) => {
  const { deletePlan } = usePlans();
  const { isSaved, toggleSaved } = useSavedPlans();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const category = categoryOf(plan);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/plans/${plan.id}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
      <Link to={`/plans/${plan.id}`} className="shrink-0">
        <CoverImage
          slug={slugify(plan.title)}
          category={category}
          coverUrl={plan.cover_url}
          className="h-14 w-14 rounded-xl"
          iconClassName="h-7 w-7 right-1 top-1"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/plans/${plan.id}`} className="truncate text-[15px] font-bold hover:text-primary">
            {plan.title}
          </Link>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              category.palette.card,
              category.palette.text,
            )}
          >
            {category.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          {plan.plan_time && (
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatWhen(plan.plan_time)}</span>
          )}
          {plan.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {plan.location}</span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {plan.participants.length} / {plan.max_participants} going
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Options for ${plan.title}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="app-theme w-44">
            <DropdownMenuItem onClick={() => navigate(`/plans/${plan.id}`)}>
              <Users className="mr-2 h-4 w-4" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleSaved(plan.id)}>
              {isSaved(plan.id) ? "Remove from saved" : "Save plan"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyLink}>
              <Link2 className="mr-2 h-4 w-4" /> Copy link
            </DropdownMenuItem>
            {owned && (
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

        <Button
          size="sm"
          variant="ghost"
          className="bg-primary/10 text-primary hover:bg-primary/20"
          asChild
        >
          <Link to={`/plans/${plan.id}`}>View</Link>
        </Button>
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
              onClick={() => deletePlan(plan)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePlanRow;
