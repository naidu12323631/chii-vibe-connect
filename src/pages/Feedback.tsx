import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquareHeart, Loader2, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeedbackForm from "@/components/FeedbackForm";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Feedback = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasSubmitted, openFeedback } = useFeedback();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-md px-6 pb-24 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border bg-card p-8 shadow-2xl"
        >
          {hasSubmitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h1 className="text-2xl font-extrabold tracking-tight">Thanks for the feedback! 💜</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We've got it. Want to say more or change your rating?
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6"
                onClick={() => {
                  // allow updating by clearing the cached flag
                  try { localStorage.removeItem(`chillout:feedback:${user.id}`); } catch { /* ignore */ }
                  openFeedback();
                }}
              >
                Send another
              </Button>
              <div className="mt-4">
                <Link to="/app" className="text-sm font-medium text-primary hover:underline">
                  Back to plans
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <MessageSquareHeart className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h1 className="text-2xl font-extrabold tracking-tight">Tell us how it's going</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your thoughts help us make chillout better for everyone.
                </p>
              </div>
              <FeedbackForm />
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Feedback;