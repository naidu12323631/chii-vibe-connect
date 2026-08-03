import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const RATING_LABELS = ["Terrible", "Meh", "Okay", "Good", "Loved it"];

const FeedbackForm = ({ onSubmitted }: { onSubmitted?: () => void }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Pick a rating first");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        // Authenticated users are tied to their account; signed-out users
        // (e.g. anonymous video chat) submit with a NULL user_id.
        ...(user ? { user_id: user.id } : {}),
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast.success("Thanks for the feedback!");
      onSubmitted?.();
    } catch (err) {
      // Already submitted before (unique user_id) — treat as done.
      const e = err as { code?: string; message?: string } | null;
      if (e?.code === "23505") {
        onSubmitted?.();
        return toast.info("You already sent feedback — thanks!");
      }
      toast.error(e?.message ?? "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">How was your experience?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-7 w-7 transition-colors",
                  n <= (hover || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
        <p className="mt-1 h-4 text-xs text-muted-foreground">
          {rating > 0 ? RATING_LABELS[rating - 1] : "Tap a star to rate"}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="feedback-comment" className="text-sm font-medium">
          Anything you'd like us to know? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="feedback-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell us what you loved, or what we could do better…"
        />
        <p className="text-right text-xs text-muted-foreground">{comment.length}/1000</p>
      </div>

      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
};

export default FeedbackForm;
