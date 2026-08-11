import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import SafetySection from "@/components/SafetySection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { usePlatform } from "@/hooks/usePlatform";

const Index = () => {
  const { user, loading } = useAuth();
  const { installed } = usePlatform();
  const navigate = useNavigate();

  // Installed launches behave like a native app: straight to the feed, or to
  // sign-in. Browser visitors still get the marketing page (and so do crawlers).
  useEffect(() => {
    if (!installed || loading) return;
    navigate(user ? "/app" : "/auth", { replace: true });
  }, [installed, loading, user, navigate]);

  if (installed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="safety">
        <SafetySection />
      </div>
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
