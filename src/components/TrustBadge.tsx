import { ShieldCheck } from "lucide-react";
import { trustExplainer, trustPercent, trustTier } from "@/lib/trust";
import { cn } from "@/lib/utils";

/**
 * Small pill showing how trustworthy a user is, as a percentage of their
 * follower count. Sits next to a display name on profiles and plans.
 *
 * `size="sm"` is the inline variant for feed cards; the default is for headers.
 */
const TrustBadge = ({
  followers,
  size = "md",
  showLabel = false,
  className,
}: {
  followers: number | null | undefined;
  size?: "sm" | "md";
  /** Also render the tier name ("Trusted") beside the percentage. */
  showLabel?: boolean;
  className?: string;
}) => {
  const count = followers ?? 0;
  const percent = trustPercent(count);
  const tier = trustTier(percent);
  const explainer = trustExplainer(percent, count);

  return (
    <span
      title={explainer}
      aria-label={explainer}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-semibold tabular-nums",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        tier.className,
        className,
      )}
    >
      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {percent}%
      {showLabel && <span className="font-medium opacity-80">{tier.label}</span>}
    </span>
  );
};

export default TrustBadge;
