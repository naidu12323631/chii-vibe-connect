import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import AvatarImg from "@/components/AvatarImg";
import TrustBadge from "@/components/TrustBadge";
import { cn } from "@/lib/utils";

export type Attendee = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  followers: number;
};

const Tile = ({
  attendee,
  isYou,
  isHost,
  onRemove,
}: {
  attendee: Attendee;
  isYou: boolean;
  isHost: boolean;
  /** Host-only: drop this person from the plan. */
  onRemove?: () => void;
}) => (
  <div className="flex flex-col items-center gap-1.5 text-center">
    <div className="relative">
      <Link
        to={isYou ? "/profile" : `/u/${attendee.id}`}
        className={cn(
          "block h-16 w-16 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background",
          isHost ? "ring-primary" : "ring-border",
        )}
        aria-label={attendee.display_name ?? "Member"}
      >
        <AvatarImg url={attendee.avatar_url} name={attendee.display_name} textClassName="text-xl" />
      </Link>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-1 -top-1 rounded-full bg-background p-1 text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-destructive"
          aria-label={`Remove ${attendee.display_name ?? "participant"}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>

    <span className="max-w-[76px] truncate text-[13px] font-semibold">
      {isYou ? "You" : attendee.display_name ?? "Member"}
    </span>
    <TrustBadge followers={attendee.followers} size="sm" />
    {isHost && (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Host</span>
    )}
  </div>
);

/**
 * The "People going" grid: the host first, then everyone who joined, then a
 * dashed placeholder per free spot. Each face carries its own trust percentage,
 * so you can see who you'd be meeting before joining.
 */
const PeopleGoing = ({
  host,
  participants,
  openSpots,
  currentUserId,
  canRemove,
  onRemove,
  onJoin,
}: {
  host: Attendee | null;
  participants: Attendee[];
  openSpots: number;
  currentUserId: string;
  /** Host viewing their own plan may remove participants. */
  canRemove: boolean;
  onRemove: (id: string) => void;
  /** Tapping a free spot joins, when there's room and you're not in yet. */
  onJoin?: () => void;
}) => (
  <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6">
    {host && (
      <Tile attendee={host} isYou={host.id === currentUserId} isHost />
    )}

    {participants
      .filter((p) => p.id !== host?.id)
      .map((p) => (
        <Tile
          key={p.id}
          attendee={p}
          isYou={p.id === currentUserId}
          isHost={false}
          onRemove={canRemove && p.id !== currentUserId ? () => onRemove(p.id) : undefined}
        />
      ))}

    {Array.from({ length: openSpots }).map((_, i) => (
      <div key={`open-${i}`} className="flex flex-col items-center gap-1.5 text-center">
        <button
          type="button"
          onClick={onJoin}
          disabled={!onJoin}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/40 text-primary transition-colors enabled:hover:bg-primary/10 disabled:opacity-60"
          aria-label={onJoin ? "Join this plan" : "Open spot"}
        >
          <Plus className="h-5 w-5" />
        </button>
        <span className="text-[13px] text-muted-foreground">Open spot</span>
      </div>
    ))}
  </div>
);

export default PeopleGoing;
