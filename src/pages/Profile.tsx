import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Plus, Loader2 } from "lucide-react";

const INTEREST_SUGGESTIONS = [
  "Coffee", "Hiking", "Gaming", "Movies", "Music", "Foodie",
  "Art", "Photography", "Books", "Fitness", "Travel", "Yoga",
  "Concerts", "Nightlife", "Board games", "Tech",
];

const AVAILABILITY_SLOTS = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekend mornings",
  "Weekend afternoons",
  "Weekend evenings",
  "Late nights",
];

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Name required").max(50, "Max 50 chars"),
  bio: z.string().trim().max(300, "Max 300 chars").optional(),
  interests: z.array(z.string().max(30)).max(15, "Max 15 interests"),
  availability: z.array(z.string()).max(10),
});

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, interests, availability")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setInterests(data.interests ?? []);
        setAvailability(data.availability ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const addInterest = (value: string) => {
    const v = value.trim();
    if (!v || interests.includes(v) || interests.length >= 15) return;
    setInterests([...interests, v]);
    setInterestInput("");
  };

  const removeInterest = (v: string) => setInterests(interests.filter((i) => i !== v));

  const toggleAvailability = (slot: string) => {
    setAvailability((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse({ display_name: displayName, bio, interests, availability });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        bio: parsed.data.bio ?? null,
        interests: parsed.data.interests,
        availability: parsed.data.availability,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Your <span className="text-gradient">profile</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Tell people who you are so we can match you with the right vibe.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Basics</CardTitle>
              <CardDescription>How you show up to others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  placeholder="Alex"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="A few words about you, your vibe, what you're into..."
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Interests</CardTitle>
              <CardDescription>What do you love doing? (up to 15)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {interests.map((i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pl-3 pr-1 py-1.5 text-sm">
                    {i}
                    <button
                      onClick={() => removeInterest(i)}
                      className="ml-1 rounded-full hover:bg-background/60 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {interests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No interests yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInterest(interestInput);
                    }
                  }}
                  placeholder="Add an interest..."
                  maxLength={30}
                />
                <Button type="button" variant="gradient-outline" size="sm" onClick={() => addInterest(interestInput)}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_SUGGESTIONS.filter((s) => !interests.includes(s)).map((s) => (
                    <button
                      key={s}
                      onClick={() => addInterest(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-accent transition-colors"
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
              <div className="grid sm:grid-cols-2 gap-3">
                {AVAILABILITY_SLOTS.map((slot) => {
                  const checked = availability.includes(slot);
                  return (
                    <label
                      key={slot}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
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

          <div className="flex justify-end gap-3 sticky bottom-4">
            <Button variant="outline" onClick={() => navigate("/")}>Cancel</Button>
            <Button variant="gradient" size="lg" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
