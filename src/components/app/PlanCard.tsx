import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bookmark, Calendar, Clock, Link2, MapPin, MoreHorizontal, Share2, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AvatarImg from "@/components/AvatarImg";
import TrustBadge from "@/components/TrustBadge";
import { useAuth } from "@/hooks/useAuth";
import { usePlans, type Participant, type Plan } from "@/hooks/usePlans";
import { usePresence } from "@/hooks/usePresence";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import { categoryOf, formatPlanTime, isSoon, timeAgo } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

// Overlapping stack of participant avatars.
const AvatarStack = ({ participants }: { participants: Participant[] }) => (
  <div className="flex -space-x-2">
    {participants.slice(0, 4).map((p) => (
      <div key={p.user_id} className="h-6 w-6 overflow-hidden rounded-full ring-2 ring-card">
        <AvatarImg url={p.profile?.avatar_url} name={p.profile?.display_name} textClassName="text-[10px]" />
      </div>
    ))}
    {participants.length > 4 && (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-card">
        +{participants.length - 4}
      </div>
    )}
  </div>
);

const PlanCard = ({ plan, index = 0 }: { plan: Plan; index?: number }) => {
  const { user } = useAuth();
  const { toggleJoin, deletePlan, isJoined } = usePlans();
  const { onlineIds } = usePresence();
  const { isSaved, toggleSaved } = useSavedPlans();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const joined = isJoined(plan);
  const isOwner = plan.user_id === user?.id;
  const count = plan.participants.length;
  const full = count >= plan.max_participants;
  const pct = Math.min(100, Math.round((count / plan.max_participants) * 100));
  const category = categoryOf(plan);
  const saved = isSaved(plan.id);
  const hostOnline = onlineIds.has(plan.user_id);
  // The description is hidden when it just repeats the inferred category pill.
  const showDescription =
    plan.description && plan.description.trim().toLowerCase() !== category.label.toLowerCase();

  const mapsHref = plan.maps_url
    ? plan.maps_url
    : plan.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.location)}`
    : null;

  // Native share sheet on phones, clipboard everywhere else.
  const share = async () => {
    const url = `${window.location.origin}/plans/${plan.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: plan.title, text: `Join "${plan.title}" on milo`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch (err) {
      // An aborted share sheet isn't a failure worth reporting.
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Could not share this plan");
    }
  };

  // Taps on the card open the plan; nested controls stop propagation themselves.
  const openPlan = () => navigate(`/plans/${plan.id}`);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
      onClick={openPlan}
      className="group cursor-pointer rounded-3xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-lg sm:p-5"
    >
      {/* ---------------------------------------------------------- header row */}
      <div className="flex items-start gap-3">
        <div className="relative h-11 w-11 shrink-0">
          <Link
            to={isOwner ? "/profile" : `/u/${plan.user_id}`}
            onClick={stop}
            className="block h-full w-full overflow-hidden rounded-full"
            aria-label={plan.profile?.display_name ?? "Host profile"}
          >
            <AvatarImg url={plan.profile?.avatar_url} name={plan.profile?.display_name} />
          </Link>
          {hostOnline && (
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card"
              title="Host is online"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link
              to={isOwner ? "/profile" : `/u/${plan.user_id}`}
              onClick={stop}
              className="font-semibold hover:text-primary hover:underline"
            >
              {plan.profile?.display_name ?? "Someone"}
            </Link>
            <TrustBadge followers={plan.host_followers} size="sm" />
            {isOwner && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">you</span>}
            <span className="text-xs text-muted-foreground">· {timeAgo(plan.created_at)}</span>
            {isSoon(plan.plan_time) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Clock className="h-3 w-3" /> Soon
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => { stop(e); share(); }}
            aria-label="Share plan"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { stop(e); toggleSaved(plan.id); }}
            aria-label={saved ? "Remove from saved" : "Save plan"}
            aria-pressed={saved}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={stop}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="app-theme w-48">
              <DropdownMenuItem onClick={() => navigate(`/plans/${plan.id}`)}>
                <Users className="mr-2 h-4 w-4" /> View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSaved(plan.id)}>
                <Bookmark className="mr-2 h-4 w-4" /> {saved ? "Remove from saved" : "Save plan"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={share}>
                <Link2 className="mr-2 h-4 w-4" /> Share plan
              </DropdownMenuItem>
              {mapsHref && (
                <DropdownMenuItem asChild>
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-2 h-4 w-4" /> Open in Maps
                  </a>
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
      </div>

      {/* --------------------------------------------------------------- body */}
      <div className="mt-2 sm:pl-14">
        <button onClick={() => navigate(`/plans/${plan.id}`)} className="block text-left">
          <h3 className="text-lg font-bold leading-snug hover:text-primary">{plan.title}</h3>
        </button>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
            <category.icon className="h-3 w-3" /> {category.label}
          </span>
        </div>

        {showDescription && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          {plan.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {plan.location}</span>
          )}
          {plan.plan_time && (
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatPlanTime(plan.plan_time)}</span>
          )}
          {plan.maps_url && (
            <a
              href={plan.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" /> Map
            </a>
          )}
        </div>

        {/* ------------------------------------------------------- capacity row */}
        <div className="mt-4 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              {count > 0 && <AvatarStack participants={plan.participants} />}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {count}/{plan.max_participants} going
              </span>
            </div>
            <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
              <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Link to={`/plans/${plan.id}`} className="text-xs font-medium text-primary hover:underline">
              View details
            </Link>
            {!isOwner && (
              <Button
                variant={joined ? "outline" : "gradient"}
                size="sm"
                onClick={(e) => { stop(e); toggleJoin(plan); }}
                disabled={!joined && full}
              >
                {joined ? "Leave" : full ? "Full" : "Join plan"}
              </Button>
            )}
          </div>
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
              onClick={() => deletePlan(plan)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default PlanCard;
