import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlans } from "@/hooks/usePlans";
import { supabase } from "@/integrations/supabase/client";
import Stepper from "./create/Stepper";
import StepDetails from "./create/StepDetails";
import StepLocation from "./create/StepLocation";
import StepPreferences from "./create/StepPreferences";
import StepReview from "./create/StepReview";
import {
  canLeaveStep, draftWhenIso, emptyDraft, errorsForStep, STEPS, validateDraft,
  type Draft, type StepKey,
} from "./create/planDraft";

const NEXT_LABEL: Record<StepKey, string> = {
  details: "Next: Choose location",
  location: "Next: Add preferences",
  preferences: "Next: Review plan",
  review: "Post plan",
};

/**
 * Four-step "create a plan" wizard, hosted once by the app shell so the tab-bar
 * "+", the sidebar button and the home banner all open the same flow.
 */
const CreatePlanDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { user } = useAuth();
  const { refetch } = usePlans();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState<StepKey>("details");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const index = STEPS.findIndex((s) => s.key === step);
  const stepErrors = useMemo(() => errorsForStep(draft, step), [draft, step]);
  const visibleErrors = showErrors ? stepErrors : {};

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setShowErrors(false);
  };

  const reset = () => {
    setDraft(emptyDraft);
    setStep("details");
    setShowErrors(false);
  };

  const close = () => {
    onOpenChange(false);
    // Let the dialog finish animating out before clearing the form.
    setTimeout(reset, 200);
  };

  const goTo = (next: StepKey) => {
    const nextIndex = STEPS.findIndex((s) => s.key === next);
    // Moving forward requires the current step to be valid; going back never does.
    if (nextIndex > index && !canLeaveStep(draft, step)) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(next);
  };

  const back = () => {
    if (index === 0) close();
    else setStep(STEPS[index - 1].key);
  };

  const submit = async () => {
    if (!user) {
      toast.error("You must be signed in to post a plan.");
      return;
    }
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      // Send them to the earliest step that still has a problem.
      const target = STEPS.find((s) => Object.keys(errorsForStep(draft, s.key)).length > 0);
      if (target) setStep(target.key);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("plans")
        .insert({
          user_id: user.id,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          location: draft.location.trim() || null,
          maps_url: draft.mapsUrl.trim() || null,
          plan_time: draftWhenIso(draft),
          max_participants: draft.maxParticipants,
          ...(draft.cover ? { cover_url: draft.cover } : {}),
        })
        .select()
        .single();
      if (error) throw error;
      console.info("[plans] stored plan:", data);
      toast.success("Plan posted! 🎉");
      close();
      refetch();
    } catch (err) {
      console.error("[plans] insert failed:", err);
      const e = err as { code?: string; message?: string };
      let msg = e.message ?? "Could not post plan";
      if (e.code === "42P01" || /relation .*plans.* does not exist/i.test(msg)) {
        msg = "The 'plans' table doesn't exist yet. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor.";
      } else if (e.code === "42703" || /cover_url/i.test(msg)) {
        msg = "Covers need a schema update — run supabase/migrations/0009_plan_cover.sql, or remove the cover to post now.";
      } else if (e.code === "42501" || /row-level security/i.test(msg)) {
        msg = "Blocked by row-level security — make sure you're signed in.";
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    if (step === "review") submit();
    else goTo(STEPS[index + 1].key);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        showClose={false}
        className="app-theme flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* ------------------------------------------------------------ header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={back}
            aria-label={index === 0 ? "Close" : "Back"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <DialogTitle className="flex-1 text-center text-lg font-bold">Create a new plan</DialogTitle>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <Stepper current={step} onJump={goTo} />
        </div>

        {/* -------------------------------------------------------------- body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {step === "details" && <StepDetails draft={draft} errors={visibleErrors} patch={patch} />}
          {step === "location" && <StepLocation draft={draft} errors={visibleErrors} patch={patch} />}
          {step === "preferences" && <StepPreferences draft={draft} errors={visibleErrors} patch={patch} />}
          {step === "review" && (
            <StepReview draft={draft} errors={validateDraft(draft)} goTo={setStep} />
          )}
        </div>

        {/* ------------------------------------------------------------ footer */}
        <div className="border-t border-border px-4 py-4">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="w-full justify-between px-6"
            onClick={advance}
            disabled={submitting}
          >
            <Sparkles className="h-4 w-4" />
            <span className="flex-1 text-center">
              {submitting ? "Posting…" : NEXT_LABEL[step]}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </span>
          </Button>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">
            {step === "review" ? "Posting shares this plan with everyone on milo." : "You can review everything before posting."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlanDialog;
