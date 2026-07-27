import type { ReactNode } from "react";
import type { Profile, ProfileStats } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import AvatarImg from "@/components/AvatarImg";
import FollowListStat from "@/components/FollowList";

// Instagram-style profile header: avatar, name, stat counts, bio, interests.
// `actions` renders the context button (Edit profile, or Follow/Unfollow).
// Tapping followers / following opens a dialog listing those users.
const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center">
    <div className="text-lg font-bold tabular-nums">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const ProfileHeader = ({
  profile,
  stats,
  actions,
  currentUserId,
}: {
  profile: Profile;
  stats: ProfileStats;
  actions?: ReactNode;
  currentUserId?: string;
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 sm:gap-8">
        {/* avatar */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full sm:h-28 sm:w-28">
          <AvatarImg url={profile.avatar_url} name={profile.display_name} textClassName="text-3xl" />
        </div>

        {/* name + stats + actions */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
              {profile.display_name ?? "Someone"}
            </h1>
            {actions}
          </div>
          <div className="flex max-w-xs justify-between gap-2">
            <Stat label="posts" value={stats.posts} />
            <FollowListStat userId={profile.id} currentUserId={currentUserId} type="followers" label="followers" value={stats.followers} />
            <FollowListStat userId={profile.id} currentUserId={currentUserId} type="following" label="following" value={stats.following} />
          </div>
        </div>
      </div>

      {/* bio */}
      {profile.bio && <p className="whitespace-pre-line text-sm text-foreground">{profile.bio}</p>}

      {/* interests */}
      {profile.interests?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.interests.map((i) => (
            <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
          ))}
        </div>
      )}

      {/* availability */}
      {profile.availability?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.availability.map((a) => (
            <span key={a} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{a}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
