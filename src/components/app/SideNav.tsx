import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarImg from "@/components/AvatarImg";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";

const isActive = (pathname: string, to: string) =>
  to === "/app" ? pathname === "/app" || pathname === "/plans" : pathname === to;

/** Laptop/desktop sidebar carrying the same destinations as the mobile tab bar. */
const SideNav = ({ onCreate }: { onCreate: () => void }) => {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { onlineCount } = usePresence();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 px-4 py-6 backdrop-blur-lg lg:flex">
      <Link to="/app" className="px-2 text-2xl font-extrabold tracking-tight">
        <span className="text-gradient">milo</span>
      </Link>

      <div className="mt-2 flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        Live · {onlineCount} online
      </div>

      <nav className="mt-7 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Button variant="gradient" size="lg" className="w-full" onClick={onCreate}>
        <Plus className="h-4 w-4" /> Create a new plan
      </Button>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <Link to="/profile" className="h-9 w-9 shrink-0 overflow-hidden rounded-full hover:opacity-90">
          <AvatarImg url={user?.avatar_url} name={user?.display_name ?? user?.email} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.display_name ?? "You"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
};

export default SideNav;
