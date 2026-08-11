import { LayoutGrid } from "lucide-react";
import { CATEGORIES } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

/**
 * "What's this plan about?" — an explicit vibe overrides the one milo would
 * otherwise infer from the title. "Other" clears it.
 */
const VibePicker = ({
  value,
  onChange,
  limit = 5,
}: {
  value: string | null;
  onChange: (vibe: string | null) => void;
  limit?: number;
}) => (
  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
    {CATEGORIES.slice(0, limit).map((category) => {
      const active = value === category.key;
      return (
        <button
          key={category.key}
          type="button"
          onClick={() => onChange(active ? null : category.key)}
          aria-pressed={active}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
            active
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:border-primary/40",
          )}
        >
          <category.icon className={cn("h-4 w-4", active ? "text-primary" : category.iconClass)} />
          {category.label}
        </button>
      );
    })}
    <button
      type="button"
      onClick={() => onChange(null)}
      aria-pressed={value === null}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
        value === null
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      <LayoutGrid className="h-4 w-4" /> Other
    </button>
  </div>
);

export default VibePicker;
