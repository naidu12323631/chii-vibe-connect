import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TIME_PRESETS = ["09:00", "12:00", "16:00", "18:30", "20:00"];

/** Local "yyyy-mm-dd" — toISOString() would shift the day in negative offsets. */
const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const fromDateValue = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/** The "When" control: a summary row that opens a calendar plus a time input. */
const WhenField = ({
  date,
  time,
  onChange,
  invalid,
}: {
  date: string;
  time: string;
  onChange: (next: { date: string; time: string }) => void;
  invalid?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selected = fromDateValue(date);
  const complete = !!date && !!time;

  const summary = complete
    ? new Date(`${date}T${time}`).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Select date & time";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
            invalid ? "border-destructive" : "border-border",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{summary}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {complete ? "Tap to change" : "Pick a date and time"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-auto p-3">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          onSelect={(next) => onChange({ date: next ? toDateValue(next) : "", time })}
          initialFocus
        />
        <div className="mt-2 space-y-2 border-t border-border pt-3">
          <Label htmlFor="plan-time">Time</Label>
          <Input
            id="plan-time"
            type="time"
            value={time}
            onChange={(e) => onChange({ date, time: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ date, time: preset })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  time === preset
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {preset}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="gradient"
            size="sm"
            className="w-full"
            disabled={!complete}
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WhenField;
