import type { ReactNode } from "react";
import { Instagram, Link2, MapPin, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarImg from "@/components/AvatarImg";
import TrustBadge from "@/components/TrustBadge";
import type { Profile } from "@/integrations/supabase/types";
import { instagramUrl } from "@/lib/profileFields";
import { cn } from "@/lib/utils";

/**
 * The saved username when there is one, otherwise a handle derived from the
 * display name (so profiles created before 0011_profile_links.sql still read
 * sensibly).
 */
export const handleFor = (
  profile: { display_name: string | null; id: string; username?: string | null },
  email?: string | null,
) => {
  if (profile.username?.trim()) return `@${profile.username.trim()}`;
  const base = profile.display_name?.trim() || email?.split("@")[0] || "milo";
  const slug = base.toLowerCase().replace(/[^a-z0-9._]+/g, "");
  return `@${slug || "milo"}`;
};

const Stat = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      "flex-1 px-2 text-center",
      onClick && "transition-opacity hover:opacity-70",
    )}
  >
    <span className="block text-xl font-extrabold tabular-nums">{value}</span>
    <span className="block text-[13px] text-muted-foreground">{label}</span>
  </button>
);

/**
 * Profile hero: avatar with an online dot, name and handle, bio, the two action
 * buttons, and the Posts / Plans / Followers / Following counts.
 *
 * The follow counters arrive as slots because they open a dialog and fetch their
 * own lists — this component stays presentational.
 */
const ProfileHero = ({
  profile,
  email,
  online,
  posts,
  plansCreated,
  followers,
  followersStat,
  followingStat,
  onEdit,
  onNewPlan,
  onJumpTo,
}: {
  profile: Profile;
  email?: string | null;
  online?: boolean;
  posts: number;
  plansCreated: number;
  /** Drives the trust badge next to the name. */
  followers: number;
  followersStat?: ReactNode;
  followingStat?: ReactNode;
  onEdit: () => void;
  onNewPlan: () => void;
  onJumpTo: (section: "posts" | "plans" | "saved") => void;
}) => (
  <div className="-mx-4 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent px-4 pb-4 pt-2">
    <div className="flex items-start gap-4">
      <div className="relative h-[104px] w-[104px] shrink-0 sm:h-28 sm:w-28">
        <div className="h-full w-full overflow-hidden rounded-full">
          <AvatarImg url={profile.avatar_url} name={profile.display_name} textClassName="text-5xl" />
        </div>
        {online && (
          <span
            className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 ring-4 ring-background"
            title="Online now"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">
                {profile.display_name ?? "Someone"}
              </h1>
              <TrustBadge followers={followers} showLabel />
            </div>
            <p className="truncate text-[14px] text-muted-foreground">{handleFor(profile, email)}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row-reverse sm:items-center">
            <Button variant="gradient" size="sm" onClick={onNewPlan}>
              <Plus className="h-4 w-4" /> New Plan
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit profile
            </Button>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-2 whitespace-pre-line text-[14px] leading-snug text-foreground/80">{profile.bio}</p>
        )}

        {(profile.location || profile.instagram || profile.website) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            )}
            {profile.instagram && (
              <a
                href={instagramUrl(profile.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Instagram className="h-3.5 w-3.5" /> @{profile.instagram}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex max-w-[220px] items-center gap-1 font-medium text-primary hover:underline"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Four counters, so the labels are kept short enough for a phone. */}
    <div className="mt-4 flex items-stretch divide-x divide-border">
      <Stat label="Posts" value={posts} onClick={() => onJumpTo("posts")} />
      <Stat label="Plans" value={plansCreated} onClick={() => onJumpTo("plans")} />
      {followersStat}
      {followingStat}
    </div>
  </div>
);

export default ProfileHero;
