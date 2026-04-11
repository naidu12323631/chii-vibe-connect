import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <a href="/" className="text-xl font-extrabold tracking-tight">
          <span className="text-gradient">chillout</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#safety" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safety</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Log in</Button>
          <Button variant="gradient" size="sm">Sign up</Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background border-b border-border px-6 pb-6 space-y-4">
          <a href="#features" className="block text-sm font-medium text-muted-foreground">Features</a>
          <a href="#safety" className="block text-sm font-medium text-muted-foreground">Safety</a>
          <a href="#" className="block text-sm font-medium text-muted-foreground">About</a>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" size="sm" className="flex-1">Log in</Button>
            <Button variant="gradient" size="sm" className="flex-1">Sign up</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
