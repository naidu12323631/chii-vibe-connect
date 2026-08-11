import { useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePlans } from "@/hooks/usePlans";
import { useHomeCity } from "@/hooks/useLocalPrefs";
import { cn } from "@/lib/utils";

/**
 * The "Where" control. Suggestions come from places already used on milo plus
 * the city saved on this device, so common spots are one tap away.
 */
const WhereField = ({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (location: string) => void;
  invalid?: boolean;
}) => {
  const { plans } = usePlans();
  const { city } = useHomeCity();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);

  // Most-used existing locations, newest first as a tiebreak.
  const suggestions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    if (city.trim()) counts.set(city.trim().toLowerCase(), { label: city.trim(), count: Infinity });
    for (const plan of plans) {
      const label = plan.location?.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { label, count: 1 });
    }
    const query = text.trim().toLowerCase();
    return [...counts.values()]
      .filter((s) => !query || s.label.toLowerCase().includes(query))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [plans, city, text]);

  const commit = (next: string) => {
    onChange(next.trim());
    setText(next.trim());
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setText(value);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
            invalid ? "border-destructive" : "border-border",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{value || "Select location"}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {value ? "Tap to change" : "Choose a place"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-72">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) commit(text);
          }}
        >
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Indiranagar, Bangalore"
            aria-label="Location"
          />
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => commit(suggestion.label)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{suggestion.label}</span>
                </button>
              ))}
            </div>
          )}
          <Button type="submit" variant="gradient" size="sm" className="mt-3 w-full" disabled={!text.trim()}>
            Use this place
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};

export default WhereField;
