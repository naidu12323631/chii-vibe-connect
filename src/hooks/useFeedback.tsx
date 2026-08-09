import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FeedbackDialog from "@/components/FeedbackDialog";

// How often to re-prompt an authenticated user who hasn't submitted feedback yet.
const FEEDBACK_INTERVAL_MS = 5 * 60 * 1000;
// First prompt a few seconds after login so the app has time to settle.
const FIRST_PROMPT_DELAY_MS = 5000;
const STORAGE_KEY = "milo:feedback";

type FeedbackContextValue = {
  hasSubmitted: boolean;
  openFeedback: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [open, setOpen] = useState(false);
  const submittedRef = useRef(false);

  // On login, figure out whether this user already sent feedback (localStorage
  // fast path, then the DB). If they haven't, the prompt timer below starts.
  useEffect(() => {
    submittedRef.current = false;
    setHasSubmitted(false);
    setOpen(false);
    if (!user) return;

    let active = true;
    const key = `${STORAGE_KEY}:${user.id}`;

    try {
      if (localStorage.getItem(key) === "1") {
        submittedRef.current = true;
        setHasSubmitted(true);
        return;
      }
    } catch { /* ignore */ }

    supabase
      .from("feedback")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const submitted = !!data;
        if (submitted) {
          try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
        }
        submittedRef.current = submitted;
        setHasSubmitted(submitted);
      });

    return () => { active = false; };
  }, [user]);

  // Prompt shortly after auth, then again every 5 minutes — until the user
  // fills the form (submittedRef flips and the effect below tears down).
  useEffect(() => {
    if (!user || submittedRef.current) return;

    const prompt = () => {
      if (!submittedRef.current) setOpen(true);
    };
    const first = setTimeout(prompt, FIRST_PROMPT_DELAY_MS);
    const interval = setInterval(prompt, FEEDBACK_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [user, hasSubmitted]);

  const markSubmitted = useCallback(() => {
    if (!user) return;
    submittedRef.current = true;
    setHasSubmitted(true);
    setOpen(false);
    try { localStorage.setItem(`${STORAGE_KEY}:${user.id}`, "1"); } catch { /* ignore */ }
  }, [user]);

  const openFeedback = useCallback(() => setOpen(true), []);

  return (
    <FeedbackContext.Provider value={{ hasSubmitted, openFeedback }}>
      {children}
      <FeedbackDialog open={open} onOpenChange={setOpen} onSubmitted={markSubmitted} />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used within FeedbackProvider");
  return ctx;
};
