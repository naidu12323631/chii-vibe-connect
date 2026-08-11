import { AlertCircle, CalendarDays, Link2, MapPin, Pencil, Users } from "lucide-react";
import { categoryByKey, categoryOf } from "@/lib/planMeta";
import { cn } from "@/lib/utils";
import {
  coverCategory, draftWhenLabel, isPresetCover, type Draft, type DraftErrors, type StepKey,
} from "./planDraft";

const Row = ({
  icon: Icon,
  label,
  value,
  onEdit,
  missing,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  onEdit: () => void;
  missing?: boolean;
}) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", missing ? "text-destructive" : "text-primary")} />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("truncate text-[14px]", missing ? "text-destructive" : "font-medium")}>{value}</p>
    </div>
    <button
      type="button"
      onClick={onEdit}
      className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <Pencil className="h-3 w-3" /> Edit
    </button>
  </div>
);

/** Step 4: everything at a glance, with a jump back to whichever step owns it. */
const StepReview = ({
  draft,
  errors,
  goTo,
}: {
  draft: Draft;
  errors: DraftErrors;
  goTo: (step: StepKey) => void;
}) => {
  const category = draft.vibe
    ? categoryByKey(draft.vibe)
    : categoryOf({ title: draft.title, description: draft.description });
  const when = draftWhenLabel(draft);
  const problems = Object.values(errors).filter(Boolean);

  return (
    <div className="space-y-4">
      {problems.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-[13px]">
            <p className="font-semibold text-destructive">Almost there</p>
            <ul className="mt-0.5 list-inside list-disc text-muted-foreground">
              {problems.map((problem) => <li key={problem}>{problem}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- the card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {draft.cover && !isPresetCover(draft.cover) ? (
          <img src={draft.cover} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div
            className={cn(
              "relative h-36 w-full bg-gradient-to-br",
              draft.cover ? coverCategory(draft.cover).cover : category.cover,
            )}
          >
            <category.icon className="absolute right-4 top-4 h-12 w-12 text-white/25" strokeWidth={1.5} />
          </div>
        )}

        <div className="p-4">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              "bg-accent text-accent-foreground",
            )}
          >
            <category.icon className="h-3 w-3" /> {category.label}
          </span>
          <h3 className="mt-2 text-lg font-bold">{draft.title.trim() || "Untitled plan"}</h3>
          {draft.description.trim() && (
            <p className="mt-1 text-sm text-muted-foreground">{draft.description.trim()}</p>
          )}
        </div>

        <div className="divide-y divide-border border-t border-border px-4">
          <Row
            icon={CalendarDays}
            label="When"
            value={when ?? "Not set yet"}
            missing={!when}
            onEdit={() => goTo("details")}
          />
          <Row
            icon={MapPin}
            label="Where"
            value={draft.location.trim() || "Not set yet"}
            missing={!draft.location.trim()}
            onEdit={() => goTo("location")}
          />
          {draft.mapsUrl.trim() && (
            <Row icon={Link2} label="Maps link" value={draft.mapsUrl.trim()} onEdit={() => goTo("location")} />
          )}
          <Row
            icon={Users}
            label="Group size"
            value={`Up to ${draft.maxParticipants} people`}
            onEdit={() => goTo("preferences")}
          />
        </div>
      </div>

      <p className="text-center text-[13px] text-muted-foreground">
        You'll be the host, and everyone who joins gets the group chat.
      </p>
    </div>
  );
};

export default StepReview;
