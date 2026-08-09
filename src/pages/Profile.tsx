import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { Post, Profile as ProfileData, ProfileStats } from "@/integrations/supabase/types";
import Navbar from "@/components/Navbar";
import ProfileHeader from "@/components/ProfileHeader";
import PostGrid from "@/components/PostGrid";
import NewPostDialog from "@/components/NewPostDialog";
import AvatarImg from "@/components/AvatarImg";
import AvatarPicker from "@/components/AvatarPicker";
import UserPlans from "@/components/UserPlans";
import ThemeToggle from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3x3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Plus, Loader2, Camera, Trash2 } from "lucide-react";

const INTEREST_SUGGESTIONS = [
  "Coffee", "Hiking", "Gaming", "Movies", "Music", "Foodie",
  "Art", "Photography", "Books", "Fitness", "Travel", "Yoga",
  "Concerts", "Nightlife", "Board games", "Tech",
];

const AVAILABILITY_SLOTS = [
  "Weekday mornings", "Weekday afternoons", "Weekday evenings",
  "Weekend mornings", "Weekend afternoons", "Weekend evenings", "Late nights",
];

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Name required").max(50, "Max 50 chars"),
  bio: z.string().trim().max(300, "Max 300 chars").optional(),
  interests: z.array(z.string().max(30)).max(15, "Max 15 interests"),
  availability: z.array(z.string()).max(10),
});

// Fetch post/follower/following counts for a user.
export async function fetchStats(userId: string): Promise<ProfileStats> {
  const [posts, followers, following] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { posts: posts.count ?? 0, followers: followers.count ?? 0, following: following.count ?? 0 };
}

const Profile = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });

  // edit-form fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [interestInput, setInterestInput] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Seed the edit-form fields from a loaded profile.
  const seedForm = (p: ProfileData) => {
    setDisplayName(p.display_name ?? "");
    setBio(p.bio ?? "");
    setInterests(p.interests ?? []);
    setAvailability(p.availability ?? []);
    setAvatarUrl(p.avatar_url ?? null);
  };

  const load = useCallback(async () => {
    if (!user) return;
    try {
      let { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, interests, availability")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      // Self-heal: create a profile row for accounts made before the trigger existed.
      if (!data) {
        const { data: created, error: insErr } = await supabase
          .from("profiles")
          .insert({ id: user.id, display_name: user.display_name ?? user.email?.split("@")[0] ?? null })
          .select("id, display_name, avatar_url, bio, interests, availability")
          .single();
        if (insErr) throw insErr;
        data = created;
      }

      const [postRows, s] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        fetchStats(user.id),
      ]);

      setProfile(data as ProfileData);
      seedForm(data as ProfileData);
      setPosts((postRows.data as Post[]) ?? []);
      setStats(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ------------------------------------------------------------ edit helpers
  const addInterest = (value: string) => {
    const v = value.trim();
    if (!v || interests.includes(v) || interests.length >= 15) return;
    setInterests([...interests, v]);
    setInterestInput("");
  };
  const removeInterest = (v: string) => setInterests(interests.filter((i) => i !== v));
  const toggleAvailability = (slot: string) =>
    setAvailability((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  const pickAvatar = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB.");
    setUploadingAvatar(true);
    try {
      const url = await uploadImage("avatars", user.id, file);
      setAvatarUrl(url);
      toast.success("Photo uploaded — save to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse({ display_name: displayName, bio, interests, availability });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: parsed.data.display_name,
        bio: parsed.data.bio ?? null,
        interests: parsed.data.interests,
        availability: parsed.data.availability,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Profile saved");
      setEditing(false);
      load();
      refreshUser(); // update the avatar shown in the nav

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (profile) seedForm(profile); // revert unsaved changes
    setEditing(false);
  };

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

  if (authLoading || loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-6 pt-28 pb-16">
        {!editing ? (
          // ------------------------------------------------------ VIEW MODE
          <>
            <ProfileHeader
              profile={profile}
              stats={stats}
              currentUserId={user.id}
              actions={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit profile</Button>
                  <NewPostDialog userId={profile.id} onCreated={load} />
                </div>
              }
            />
            <Tabs defaultValue="posts" className="mt-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts"><Grid3x3 className="mr-1.5 h-4 w-4" /> Posts</TabsTrigger>
                <TabsTrigger value="plans"><CalendarDays className="mr-1.5 h-4 w-4" /> Plans</TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="mt-6"><PostGrid posts={posts} canDelete onDelete={deletePost} /></TabsContent>
              <TabsContent value="plans" className="mt-6"><UserPlans userId={profile.id} /></TabsContent>
            </Tabs>
          </>
        ) : (
          // ------------------------------------------------------ EDIT MODE
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Edit <span className="text-gradient">profile</span>
              </h1>
            </div>

            {/* avatar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Photo</CardTitle>
                <CardDescription>Upload your own, pick a preset, or remove it</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-5">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
                    <AvatarImg url={avatarUrl} name={displayName} textClassName="text-3xl" />
                    {uploadingAvatar && (
                      <div className="absolute inset-0 grid place-items-center bg-black/50">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
                    />
                    <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                      <Camera className="h-4 w-4" /> Upload
                    </Button>
                    {avatarUrl && (
                      <Button variant="outline" size="sm" onClick={() => setAvatarUrl(null)} disabled={uploadingAvatar}>
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Or choose a preset</p>
                  <AvatarPicker value={avatarUrl} onSelect={setAvatarUrl} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Basics</CardTitle>
                <CardDescription>How you show up to others</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Alex" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={4} placeholder="A few words about you..." />
                  <p className="text-right text-xs text-muted-foreground">{bio.length}/300</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Interests</CardTitle>
                <CardDescription>What do you love doing? (up to 15)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex min-h-[2rem] flex-wrap gap-2">
                  {interests.map((i) => (
                    <Badge key={i} variant="secondary" className="gap-1 py-1.5 pl-3 pr-1 text-sm">
                      {i}
                      <button onClick={() => removeInterest(i)} className="ml-1 rounded-full p-0.5 hover:bg-background/60">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {interests.length === 0 && <p className="text-sm text-muted-foreground">No interests yet.</p>}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(interestInput); } }}
                    placeholder="Add an interest..."
                    maxLength={30}
                  />
                  <Button type="button" variant="gradient-outline" size="sm" onClick={() => addInterest(interestInput)}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_SUGGESTIONS.filter((s) => !interests.includes(s)).map((s) => (
                      <button
                        key={s}
                        onClick={() => addInterest(s)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Availability</CardTitle>
                <CardDescription>When are you usually down to hang?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AVAILABILITY_SLOTS.map((slot) => {
                    const checked = availability.includes(slot);
                    return (
                      <label
                        key={slot}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                          checked ? "border-primary/60 bg-accent" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleAvailability(slot)} />
                        <span className="text-sm font-medium">{slot}</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Appearance</CardTitle>
                <CardDescription>Choose how milo looks to you</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeToggle />
              </CardContent>
            </Card>

            <div className="sticky bottom-4 flex justify-end gap-3">
              <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
              <Button variant="gradient" size="lg" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save profile
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
