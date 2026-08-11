import { Link } from "react-router-dom";
import { CalendarCheck, ChevronRight, Users } from "lucide-react";
import AvatarImg from "@/components/AvatarImg";
import TrustBadge from "@/components/TrustBadge";
import { trustPercent, trustTier } from "@/lib/trust";

export type HostSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  /** Plans this user has created — the "23 plans hosted" line. */
  plansHosted: number;
  followers: number;
};

/**
 * "About the host" card. There are no reviews in milo, so the credibility line
 * is the host's trust percentage (from their followers) plus how many plans
 * they have actually hosted — both real numbers rather than a rating.
 */
const HostCard = ({ host, isYou }: { host: HostSummary; isYou: boolean }) => {
  const tier = trustTier(trustPercent(host.followers));

  return (
    <Link
      to={isYou ? "/profile" : `/u/${host.id}`}
      className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
        <AvatarImg url={host.avatar_url} name={host.display_name} textClassName="text-xl" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[17px] font-bold">{host.display_name ?? "Someone"}</span>
          <TrustBadge followers={host.followers} />
          {isYou && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">you</span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" />
            {host.plansHosted} {host.plansHosted === 1 ? "plan" : "plans"} hosted
          </span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {host.followers} {host.followers === 1 ? "follower" : "followers"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${tier.className}`}>
            {tier.label}
          </span>
        </div>

        {host.bio && <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{host.bio}</p>}
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
};

export default HostCard;
