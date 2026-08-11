import { Check } from "lucide-react";
import { STEPS, type StepKey } from "./planDraft";
import { cn } from "@/lib/utils";

/** 1 Details ---- 2 Location ---- 3 Preferences ---- 4 Review */
const Stepper = ({
  current,
  onJump,
}: {
  current: StepKey;
  onJump: (step: StepKey) => void;
}) => {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.key} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onJump(step.key)}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-2 rounded-full py-1 pr-1 text-sm"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  active && "gradient-primary text-primary-foreground",
                  done && "bg-primary/15 text-primary",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <span className="h-px w-6 shrink-0 border-t border-dashed border-border sm:w-10" />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
