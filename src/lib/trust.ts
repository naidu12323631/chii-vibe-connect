// Trustworthiness expressed as a percentage, derived from a user's follower count.
//
// The curve is logarithmic on purpose: the first handful of followers moves the
// score a lot (going from nobody to a few people vouching for you is the real
// signal), while the top of the range stays hard to reach so a big account
// can't sit at a flat 100%.

/** Follower count that maps to the top of the scale. */
export const TRUST_CAP_FOLLOWERS = 500;

/** Highest percentage we ever show — nobody is 100% trustworthy. */
export const TRUST_MAX_PERCENT = 99;

/**
 * Trust percentage (0–99) for a follower count.
 * 0 followers → 0%, 10 → 39%, 50 → 63%, 100 → 74%, 500+ → 99%.
 */
export const trustPercent = (followers: number | null | undefined) => {
  if (!followers || !Number.isFinite(followers) || followers <= 0) return 0;
  const ratio = Math.log(1 + followers) / Math.log(1 + TRUST_CAP_FOLLOWERS);
  return Math.min(TRUST_MAX_PERCENT, Math.round(ratio * 100));
};

export type TrustTier = {
  label: string;
  /** Tailwind classes for the badge pill. */
  className: string;
};

/** Band a percentage falls into, used for the badge label and colour. */
export const trustTier = (percent: number): TrustTier => {
  if (percent >= 75) return { label: "Highly trusted", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
  if (percent >= 50) return { label: "Trusted", className: "bg-primary/15 text-primary" };
  if (percent >= 25) return { label: "Rising", className: "bg-amber-500/15 text-amber-600 dark:text-amber-500" };
  return { label: "New here", className: "bg-muted text-muted-foreground" };
};

/** Hover/screen-reader text explaining where the number comes from. */
export const trustExplainer = (percent: number, followers: number) =>
  `${percent}% trust score · ${trustTier(percent).label} · based on ${followers} ` +
  `${followers === 1 ? "follower" : "followers"}`;
