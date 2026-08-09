import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AvatarImg from "@/components/AvatarImg";
import { toast } from "sonner";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <Link to={user ? "/app" : "/"} className="text-xl font-extrabold tracking-tight">
          <span className="text-gradient">Milo</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {user && <Link to="/app" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Plans</Link>}
          <Link to="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Video chat</Link>
          <Link to="/feedback" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Feedback</Link>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#safety" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safety</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" className="h-9 w-9 overflow-hidden rounded-full hover:opacity-90" aria-label="Profile">
                <AvatarImg url={user.avatar_url} name={user.display_name ?? user.email} />
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/auth">Log in</Link></Button>
              <Button variant="gradient" size="sm" asChild><Link to="/auth">Sign up</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-6 pb-6 space-y-4">
          {user && <Link to="/app" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Plans</Link>}
          <Link to="/chat" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Video chat</Link>
          <Link to="/feedback" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Feedback</Link>
          <a href="#features" className="block text-sm font-medium text-muted-foreground">Features</a>
          <a href="#safety" className="block text-sm font-medium text-muted-foreground">Safety</a>
          <div className="flex gap-3 pt-2">
            {user ? (
              <Button variant="gradient" size="sm" className="flex-1" onClick={handleSignOut}>Sign out</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild><Link to="/auth">Log in</Link></Button>
                <Button variant="gradient" size="sm" className="flex-1" asChild><Link to="/auth">Sign up</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
