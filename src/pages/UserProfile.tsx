import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Post, Profile as ProfileData, ProfileStats } from "@/integrations/supabase/types";
import Navbar from "@/components/Navbar";
import ProfileHeader from "@/components/ProfileHeader";
import PostGrid from "@/components/PostGrid";
import { fetchStats } from "@/pages/Profile";
import { Button } from "@/components/ui/button";

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Your own profile lives at /profile with edit controls.
  useEffect(() => {
    if (user && id === user.id) navigate("/profile", { replace: true });
  }, [user, id, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, interests, availability")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setProfile(null); return; }

      const [postRows, s] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        fetchStats(id),
      ]);
      setProfile(data as ProfileData);
      setPosts((postRows.data as Post[]) ?? []);
      setStats(s);

      if (user) {
        const { data: f } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", id)
          .maybeSingle();
        setFollowing(!!f);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const toggleFollow = async () => {
    if (!user) return navigate("/auth");
    if (!id) return;
    setBusy(true);
    // Optimistic update.
    const next = !following;
    setFollowing(next);
    setStats((s) => ({ ...s, followers: Math.max(0, s.followers + (next ? 1 : -1)) }));
    try {
      if (next) {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
        if (error) throw error;
      }
    } catch (err) {
      // Roll back on failure.
      setFollowing(!next);
      setStats((s) => ({ ...s, followers: Math.max(0, s.followers + (next ? -1 : 1)) }));
      toast.error(err instanceof Error ? err.message : "Could not update follow");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-6 pt-28 text-center">
          <h1 className="text-2xl font-bold">User not found</h1>
          <Button variant="gradient" className="mt-4" onClick={() => navigate("/app")}>Back to plans</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-6 pt-28 pb-16">
        <ProfileHeader
          profile={profile}
          stats={stats}
          actions={
            <Button
              variant={following ? "outline" : "gradient"}
              size="sm"
              onClick={toggleFollow}
              disabled={busy}
            >
              {following ? "Following" : "Follow"}
            </Button>
          }
        />
        <hr className="my-8 border-border" />
        <PostGrid posts={posts} />
      </main>
    </div>
  );
};

export default UserProfile;
