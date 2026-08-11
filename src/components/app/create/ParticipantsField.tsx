import { Minus, Plus, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTICIPANTS_MAX, PARTICIPANTS_MIN } from "./planDraft";

/** Stepper for the headcount, with the encouraging tip from the design. */
const ParticipantsField = ({
  value,
  onChange,
  showTip = true,
}: {
  value: number;
  onChange: (next: number) => void;
  showTip?: boolean;
}) => {
  const clamp = (next: number) => Math.min(PARTICIPANTS_MAX, Math.max(PARTICIPANTS_MIN, next));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
        <Users className="h-5 w-5 text-primary" />
      </span>

      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= PARTICIPANTS_MIN}
          aria-label="Fewer participants"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            value <= PARTICIPANTS_MIN
              ? "text-muted-foreground/40"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={value}
          min={PARTICIPANTS_MIN}
          max={PARTICIPANTS_MAX}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || PARTICIPANTS_MIN))}
          aria-label="Max participants"
          className="w-10 border-0 bg-transparent text-center text-[15px] font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= PARTICIPANTS_MAX}
          aria-label="More participants"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            value >= PARTICIPANTS_MAX
              ? "text-muted-foreground/40"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showTip && (
        <p className="flex min-w-[200px] flex-1 items-start gap-2 rounded-2xl bg-primary/8 p-3 text-[13px] leading-snug text-foreground/80">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Tip: Smaller groups get better vibes and more replies!</span>
        </p>
      )}
    </div>
  );
};

export default ParticipantsField;
