import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

// Segmented Light / Dark / System theme switcher (persists via next-themes).
const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes needs the client to mount before `theme` is accurate.
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? "system" : "system";

  return (
    <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const selected = active === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={selected}
          >
            <Icon className="h-4 w-4" /> {o.label}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
