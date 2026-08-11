import { createContext, useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogOut, Menu, MessageSquare, Plus, Shield, ScrollText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AvatarImg from "@/components/AvatarImg";
import NotificationsBell from "@/components/NotificationsBell";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { PlansProvider } from "@/hooks/usePlans";
import { PresenceProvider } from "@/hooks/usePresence";
import { useOnline } from "@/hooks/usePlatform";
import BottomNav from "./BottomNav";
import CreatePlanDialog from "./CreatePlanDialog";
import InstallPrompt from "./InstallPrompt";
import SideNav from "./SideNav";

const CreatePlanContext = createContext<() => void>(() => {});

/** Opens the shared "create a new plan" dialog from anywhere inside the shell. */
export const useCreatePlan = () => useContext(CreatePlanContext);

/**
 * Layout route for the signed-in app. Mounts the plan feed and presence once so
 * they survive tab changes, and renders the chrome: a sidebar on laptops, a tab
 * bar with a centre "+" on phones.
 */
const AppShell = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const online = useOnline();
  const [createOpen, setCreateOpen] = useState(false);

  // On your own profile the header avatar would just link to the current page,
  // so it becomes a menu instead — which is also the only place to sign out on
  // a phone, since the sidebar is hidden there.
  const showMenu = pathname === "/profile";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PresenceProvider>
      <PlansProvider>
        <CreatePlanContext.Provider value={() => setCreateOpen(true)}>
          <div className="app-theme min-h-screen bg-background text-foreground">
            <SideNav onCreate={() => setCreateOpen(true)} />

            <div className="lg:pl-64">
              <header className="pt-safe sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
                <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-8">
                  <Link to="/app" className="text-2xl font-extrabold tracking-tight lg:hidden">
                    <span className="text-gradient">milo</span>
                  </Link>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="hidden lg:inline-flex"><ThemeToggle /></span>
                    <NotificationsBell />
                    {showMenu ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
                          aria-label="Menu"
                        >
                          <Menu className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="app-theme w-52">
                          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> New plan
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/feedback"><MessageSquare className="mr-2 h-4 w-4" /> Send feedback</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/privacy"><Shield className="mr-2 h-4 w-4" /> Privacy</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/terms"><ScrollText className="mr-2 h-4 w-4" /> Terms</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={handleSignOut}
                          >
                            <LogOut className="mr-2 h-4 w-4" /> Sign out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Link
                        to="/profile"
                        className="h-9 w-9 overflow-hidden rounded-full hover:opacity-90"
                        aria-label="Your profile"
                      >
                        <AvatarImg url={user.avatar_url} name={user.display_name ?? user.email} />
                      </Link>
                    )}
                  </div>
                </div>
              </header>

              {!online && (
                <div className="bg-amber-500/15 px-4 py-2 text-center text-[13px] font-medium text-amber-700 dark:text-amber-300">
                  You're offline — showing the last loaded plans.
                </div>
              )}

              {/* pb leaves room for the fixed tab bar on phones. */}
              <main className="px-4 pb-28 pt-4 lg:px-8 lg:pb-12">
                <div className="mx-auto w-full max-w-3xl">
                  <InstallPrompt />
                </div>
                <Outlet />
              </main>
            </div>

            <BottomNav onCreate={() => setCreateOpen(true)} />
            <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
          </div>
        </CreatePlanContext.Provider>
      </PlansProvider>
    </PresenceProvider>
  );
};

export default AppShell;
