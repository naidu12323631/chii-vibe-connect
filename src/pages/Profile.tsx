import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bookmark, CalendarDays, Grid3x3, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Post, Profile as ProfileData, ProfileStats } from "@/integrations/supabase/types";
import NewPostDialog from "@/components/NewPostDialog";
import FollowListStat from "@/components/FollowList";
import ProfileHero from "@/components/app/profile/ProfileHero";
import ProfilePostsGrid from "@/components/app/profile/ProfilePostsGrid";
import ProfilePlanRow from "@/components/app/profile/ProfilePlanRow";
import SavedPlanCard from "@/components/app/profile/SavedPlanCard";
import EditProfileForm from "@/components/app/profile/EditProfileForm";
import { useCreatePlan } from "@/components/app/AppShell";
import { usePlans } from "@/hooks/usePlans";
import { usePresence } from "@/hooks/usePresence";
import { useSavedPlans } from "@/hooks/useLocalPrefs";
import { cn } from "@/lib/utils";

// Fetch post/follower/following counts for a user.
export async function fetchStats(userId: string): Promise<ProfileStats> {
  const [posts, followers, following] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { posts: posts.count ?? 0, followers: followers.count ?? 0, following: following.count ?? 0 };
}

const PROFILE_TABS = [
  { key: "posts", label: "Posts", icon: Grid3x3 },
  { key: "plans", label: "Plans created", icon: CalendarDays },
  { key: "saved", label: "Saved plans", icon: Bookmark },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]["key"];

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { plans } = usePlans();
  const { onlineIds } = usePresence();
  const { saved } = useSavedPlans();
  const openCreate = useCreatePlan();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });

  // ------------------------------------------------------------- view state
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const postsRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const savedRef = useRef<HTMLElement>(null);

  // Tabs scroll to their section rather than hiding the others, matching the design.
  const jumpTo = (tab: ProfileTab) => {
    setActiveTab(tab);
    const target = { posts: postsRef, plans: plansRef, saved: savedRef }[tab];
    target.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // select("*") so the page keeps working whether or not the newer profile
      // columns (username, links, visibility) have been migrated in yet.
      const { data: existing, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      let data = existing;

      // Self-heal: create a profile row for accounts made before the trigger existed.
      if (!data) {
        const { data: created, error: insErr } = await supabase
          .from("profiles")
          .insert({ id: user.id, display_name: user.display_name ?? user.email?.split("@")[0] ?? null })
          .select("*")
          .single();
        if (insErr) throw insErr;
        data = created;
      }

      const [postRows, s] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        fetchStats(user.id),
      ]);

      setProfile(data as ProfileData);
      setPosts((postRows.data as Post[]) ?? []);
      setStats(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Plans come from the shared feed, so hosting or saving updates these live.
  const myPlans = useMemo(
    () => (user ? plans.filter((p) => p.user_id === user.id) : []),
    [plans, user],
  );
  const savedPlans = useMemo(() => plans.filter((p) => saved.has(p.id)), [plans, saved]);

  const deletePost = async (post: Post) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      setPosts((ps) => ps.filter((p) => p.id !== post.id));
      setStats((s) => ({ ...s, posts: Math.max(0, s.posts - 1) }));
      toast.success("Post deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete post");
    }
  };

  if (authLoading || loading || !profile || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (editing) {
    return (
      <main className="mx-auto w-full max-w-2xl">
        <EditProfileForm
          profile={profile}
          onSaved={() => { setEditing(false); load(); }}
          onCancel={() => setEditing(false)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl">
      <ProfileHero
        profile={profile}
        email={user.email}
        online={onlineIds.has(user.id)}
        posts={stats.posts}
        plansCreated={myPlans.length}
        saved={savedPlans.length}
        followers={stats.followers}
        onEdit={() => setEditing(true)}
        onNewPlan={openCreate}
        onJumpTo={jumpTo}
      />

      {/* ----------------------------------------------------------------- tabs */}
      <div className="-mx-4 mb-6 border-b border-border bg-card px-2">
        <div className="no-scrollbar flex overflow-x-auto">
          {PROFILE_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => jumpTo(tab.key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-[14px] font-semibold transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------- posts */}
      <section ref={postsRef} className="scroll-mt-32">
        <ProfilePostsGrid
          posts={showAllPosts ? posts : posts.slice(0, 6)}
          canDelete
          onDelete={deletePost}
        />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {posts.length > 6 && (
            <Button
              variant="ghost"
              className="bg-primary/10 px-8 text-primary hover:bg-primary/20"
              onClick={() => setShowAllPosts((v) => !v)}
            >
              {showAllPosts ? "Show fewer posts" : `View all posts (${posts.length})`}
            </Button>
          )}
          <NewPostDialog userId={profile.id} onCreated={load} />
        </div>
      </section>

      {/* -------------------------------------------------------- plans created */}
      <section ref={plansRef} className="mt-8 scroll-mt-32 border-t border-border pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Plans created</h2>
          {myPlans.length > 3 && (
            <button
              onClick={() => setShowAllPlans((v) => !v)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showAllPlans ? "Show less" : "See all"}
            </button>
          )}
        </div>
        {myPlans.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card py-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <h3 className="font-semibold">No plans yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Host something and it shows up here.</p>
            <Button variant="gradient" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {(showAllPlans ? myPlans : myPlans.slice(0, 3)).map((plan) => (
              <ProfilePlanRow key={plan.id} plan={plan} owned />
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- saved plans */}
      <section ref={savedRef} className="mt-8 scroll-mt-32 border-t border-border pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Saved plans</h2>
          {savedPlans.length > 4 && (
            <button
              onClick={() => setShowAllSaved((v) => !v)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showAllSaved ? "Show less" : "See all"}
            </button>
          )}
        </div>
        {savedPlans.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card py-12 text-center">
            <Bookmark className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <h3 className="font-semibold">Nothing saved yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the bookmark on any plan to keep it here.
            </p>
          </div>
        ) : showAllSaved ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {savedPlans.map((plan) => <SavedPlanCard key={plan.id} plan={plan} />)}
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {savedPlans.map((plan) => <SavedPlanCard key={plan.id} plan={plan} />)}
          </div>
        )}
      </section>

      {/* Followers / following stay reachable — the hero shows the three counts
          from the design instead. */}
      <div className="mt-8 flex justify-center gap-6 border-t border-border pt-6">
        <FollowListStat userId={profile.id} currentUserId={user.id} type="followers" label="followers" value={stats.followers} />
        <FollowListStat userId={profile.id} currentUserId={user.id} type="following" label="following" value={stats.following} />
      </div>
    </main>
  );
};

export default Profile;
