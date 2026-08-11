import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "./navItems";

/** `/plans` is an alias of the home tab, so both should light it up. */
const isActive = (pathname: string, to: string) =>
  to === "/app" ? pathname === "/app" || pathname === "/plans" : pathname === to;

const Tab = ({ item, active }: { item: NavItem; active: boolean }) => (
  <Link
    to={item.to}
    aria-label={item.label}
    aria-current={active ? "page" : undefined}
    className={cn(
      "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-colors",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    )}
  >
    <item.icon className={cn("h-[22px] w-[22px] shrink-0", active && "stroke-[2.5]")} />
    <span className={cn("w-full truncate text-center text-[9px] leading-tight", active && "font-semibold")}>
      {item.label}
    </span>
  </Link>
);

/**
 * Mobile / tablet tab bar: Home · Explore · Maps · (+) · New Chat · Video Chat · Profile.
 * Hidden on laptops, where SideNav takes over.
 */
const BottomNav = ({ onCreate }: { onCreate: () => void }) => {
  const { pathname } = useLocation();
  const left = NAV_ITEMS.filter((i) => i.side === "left");
  const right = NAV_ITEMS.filter((i) => i.side === "right");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg lg:hidden">
      <div
        className="mx-auto flex max-w-xl items-end justify-between gap-0.5 px-1.5"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        {left.map((item) => <Tab key={item.to} item={item} active={isActive(pathname, item.to)} />)}

        <button
          onClick={onCreate}
          aria-label="Create a new plan"
          className="gradient-primary shadow-glow -mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-primary-foreground ring-4 ring-background transition-transform active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>

        {right.map((item) => <Tab key={item.to} item={item} active={isActive(pathname, item.to)} />)}
      </div>
    </nav>
  );
};

export default BottomNav;
