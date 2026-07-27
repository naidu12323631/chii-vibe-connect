import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import AvatarImg from "@/components/AvatarImg";

type Row = { id: string; display_name: string | null; avatar_url: string | null };

// A tappable profile stat (followers / following) that opens a dialog listing
// those users, Instagram-style. `currentUserId` links to /profile for self.
const FollowListStat = ({
  userId,
  currentUserId,
  type,
  label,
  value,
}: {
  userId: string;
  currentUserId?: string;
  type: "followers" | "following";
  label: string;
  value: number;
}) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadList = async () => {
    setLoading(true);
    setRows(null);
    try {
      // followers → people whose following_id is this user; we want their follower_id.
      // following → rows where follower_id is this user; we want their following_id.
      const wantCol = type === "followers" ? "follower_id" : "following_id";
      const matchCol = type === "followers" ? "following_id" : "follower_id";
      const { data: links } = await supabase.from("follows").select(wantCol).eq(matchCol, userId);
      const ids = [...new Set((links ?? []).map((l: Record<string, string>) => l[wantCol]))];
      if (!ids.length) { setRows([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      setRows((profs as Row[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) loadList(); }}>
      <DialogTrigger asChild>
        <button type="button" className="text-center transition-opacity hover:opacity-70">
          <div className="text-lg font-bold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="capitalize">{label}</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {loading || rows === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No {label} yet.</p>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id}
                to={r.id === currentUserId ? "/profile" : `/u/${r.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <AvatarImg url={r.avatar_url} name={r.display_name} />
                </div>
                <span className="truncate text-sm font-medium">{r.display_name ?? "Someone"}</span>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListStat;
