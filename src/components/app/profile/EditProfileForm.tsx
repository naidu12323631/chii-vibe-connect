import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Check, CheckCircle2, ChevronRight, Globe, Instagram, Link2, Loader2,
  Lock, MapPin, Plus, Trash2, Users, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import AvatarImg from "@/components/AvatarImg";
import AvatarPicker from "@/components/AvatarPicker";
import { useAuth } from "@/hooks/useAuth";
import { useHomeCity } from "@/hooks/useLocalPrefs";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { Profile, ProfileVisibility } from "@/integrations/supabase/types";
import {
  BIO_MAX, checkUsernameFormat, interestEmoji, INTERESTS_MAX, NAME_MAX, normaliseInstagram,
  normaliseUsername, normaliseWebsite, usernameProblemMessage, VISIBILITY_OPTIONS,
  visibilityOption,
} from "@/lib/profileFields";
import { cn } from "@/lib/utils";

const INTEREST_SUGGESTIONS = [
  "Coffee", "Travel", "Gaming", "Movies", "Adventure", "Books", "Music", "Hiking",
  "Foodie", "Art", "Photography", "Fitness", "Yoga", "Concerts", "Nightlife",
  "Board games", "Tech",
];

const AVAILABILITY_SLOTS = [
  "Weekday mornings", "Weekday afternoons", "Weekday evenings",
  "Weekend mornings", "Weekend afternoons", "Weekend evenings", "Late nights",
];

const VISIBILITY_ICON: Record<ProfileVisibility, typeof Globe> = {
  public: Globe,
  followers: Users,
  private: Lock,
};

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid" | "unsupported";

const SectionLabel = ({ children, optional }: { children: React.ReactNode; optional?: boolean }) => (
  <Label className="text-[15px] font-bold">
    {children}
    {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
  </Label>
);

/**
 * Edit Profile. Name, username, bio, location, interests, social links and
 * visibility all live on the `profiles` row (see 0011_profile_links.sql);
 * availability is kept here too so that existing setting stays editable.
 */
const EditProfileForm = ({
  profile,
  onSaved,
  onCancel,
}: {
  profile: Profile;
  onSaved: () => void;
  onCancel: () => void;
}) => {
  const { user, refreshUser } = useAuth();
  const { setCity } = useHomeCity();

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);
  const [availability, setAvailability] = useState<string[]>(profile.availability ?? []);
  const [instagram, setInstagram] = useState(profile.instagram ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [visibility, setVisibility] = useState<ProfileVisibility>(profile.visibility ?? "public");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null);

  const [interestInput, setInterestInput] = useState("");
  const [addingInterest, setAddingInterest] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const normalisedUsername = normaliseUsername(username);
  const unchangedUsername = normalisedUsername === (profile.username ?? "");

  // ------------------------------------------------------ username availability
  useEffect(() => {
    if (!normalisedUsername || unchangedUsername) {
      setUsernameState("idle");
      return;
    }
    const problem = checkUsernameFormat(normalisedUsername);
    if (problem) {
      setUsernameState("invalid");
      return;
    }

    setUsernameState("checking");
    let active = true;
    // Debounced so typing doesn't hit the database on every keystroke.
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", { candidate: normalisedUsername });
      if (!active) return;
      if (error) {
        // The function is missing until 0011 has been run.
        setUsernameState("unsupported");
        return;
      }
      setUsernameState(data ? "available" : "taken");
    }, 450);

    return () => { active = false; clearTimeout(timer); };
  }, [normalisedUsername, unchangedUsername]);

  // ------------------------------------------------------------------- avatar
  const pickAvatar = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      setAvatarUrl(await uploadImage("avatars", user.id, file));
      toast.success("Photo updated — hit Save to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------------- interests
  const addInterest = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (interests.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setInterestInput("");
      return;
    }
    if (interests.length >= INTERESTS_MAX) {
      toast.error(`Up to ${INTERESTS_MAX} interests.`);
      return;
    }
    setInterests([...interests, trimmed]);
    setInterestInput("");
  };

  const toggleAvailability = (slot: string) =>
    setAvailability((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  // --------------------------------------------------------------------- save
  const save = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast.error("Your name can't be empty.");
      return;
    }
    if (bio.length > BIO_MAX) {
      toast.error(`Trim your bio to ${BIO_MAX} characters.`);
      return;
    }
    if (normalisedUsername) {
      const problem = checkUsernameFormat(normalisedUsername);
      if (problem) {
        toast.error(usernameProblemMessage(problem)!);
        return;
      }
      if (usernameState === "taken") {
        toast.error("That username is taken.");
        return;
      }
    }
    const site = normaliseWebsite(website);
    if (site.error) {
      toast.error(site.error);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        interests,
        availability,
        avatar_url: avatarUrl,
        username: normalisedUsername || null,
        location: location.trim() || null,
        instagram: normaliseInstagram(instagram),
        website: site.url,
        visibility,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Keep the "Nearby" filter aligned with the location you just set.
      if (location.trim()) setCity(location.trim());

      toast.success("Profile saved");
      refreshUser();
      onSaved();
    } catch (err) {
      const e = err as { code?: string; message?: string };
      let msg = e.message ?? "Could not save profile";
      if (e.code === "23505" || /profiles_username_unique/.test(msg)) {
        msg = "That username is already taken.";
      } else if (e.code === "PGRST204" || e.code === "42703") {
        msg = "Usernames, links and visibility need a schema update — run supabase/migrations/0011_profile_links.sql.";
      } else if (/profiles_username_format/.test(msg)) {
        msg = "Usernames can only use letters, numbers, dots and underscores.";
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const currentVisibility = visibilityOption(visibility);
  const VisibilityIcon = VISIBILITY_ICON[visibility];

  return (
    <div className="pb-4">
      {/* ------------------------------------------------------------- header */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:top-16">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold">Edit Profile</h1>
        <button
          type="button"
          onClick={save}
          disabled={saving || uploadingAvatar}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving" : "Save"}
        </button>
      </div>

      <div className="space-y-6">
        {/* --------------------------------------------------- profile photo */}
        <div className="flex items-start gap-4">
          <div className="relative h-[104px] w-[104px] shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full bg-primary/10">
              <AvatarImg url={avatarUrl} name={displayName} textClassName="text-4xl" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Change photo"
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-card shadow-md transition-colors hover:bg-accent"
            >
              <Camera className="h-4 w-4 text-primary" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold">Profile photo</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">JPG, PNG or WEBP. Max size 5MB</p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Camera className="h-4 w-4" /> Change photo
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAvatarUrl(null)}
                  disabled={uploadingAvatar}
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPresets((v) => !v)}
              className="mt-2 text-[13px] font-medium text-primary hover:underline"
            >
              {showPresets ? "Hide 3D avatars" : "Or pick a 3D avatar"}
            </button>
          </div>
        </div>

        {showPresets && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <AvatarPicker value={avatarUrl} onSelect={setAvatarUrl} />
          </div>
        )}

        {/* ---------------------------------------------------------- name */}
        <div>
          <SectionLabel>Name</SectionLabel>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Your name"
            aria-label="Name"
            className="mt-2 h-14 rounded-2xl text-[15px]"
          />
        </div>

        {/* ------------------------------------------------------ username */}
        <div>
          <SectionLabel>Username</SectionLabel>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">@</span>
            <Input
              value={normalisedUsername}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              aria-label="Username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 rounded-2xl pl-8 pr-32 text-[15px]"
            />
            <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[13px] font-medium">
              {usernameState === "checking" && (
                <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Checking</span></>
              )}
              {usernameState === "available" && (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-muted-foreground">Available</span></>
              )}
              {usernameState === "taken" && (
                <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive">Taken</span></>
              )}
              {usernameState === "invalid" && (
                <span className="text-destructive">
                  {usernameProblemMessage(checkUsernameFormat(normalisedUsername))}
                </span>
              )}
            </span>
          </div>
          {usernameState === "unsupported" && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Availability can't be checked until 0011_profile_links.sql has been run.
            </p>
          )}
        </div>

        {/* ----------------------------------------------------------- bio */}
        <div>
          <SectionLabel>Bio</SectionLabel>
          <div className="relative mt-2">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="A few words about you..."
              aria-label="Bio"
              className="min-h-[120px] rounded-2xl pb-8 text-[15px]"
            />
            <span
              className={cn(
                "pointer-events-none absolute bottom-3 right-4 text-[13px]",
                bio.length > BIO_MAX ? "font-semibold text-destructive" : "text-muted-foreground",
              )}
            >
              {bio.length} / {BIO_MAX}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ location */}
        <div>
          <SectionLabel>Location</SectionLabel>
          <div className="relative mt-2">
            <MapPin className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-primary" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bangalore, India"
              aria-label="Location"
              className="h-14 rounded-2xl pl-11 pr-11 text-[15px]"
            />
            {location && (
              <button
                type="button"
                onClick={() => setLocation("")}
                aria-label="Clear location"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Also used for the “Nearby” filter on Home.
          </p>
        </div>

        {/* ----------------------------------------------------- interests */}
        <div>
          <SectionLabel>Interests</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span
                key={interest}
                className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 py-2 pl-3.5 pr-2 text-[14px] font-semibold text-primary"
              >
                <span aria-hidden>{interestEmoji(interest)}</span>
                {interest}
                <button
                  type="button"
                  onClick={() => setInterests(interests.filter((i) => i !== interest))}
                  aria-label={`Remove ${interest}`}
                  className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {addingInterest ? (
              <form
                onSubmit={(e) => { e.preventDefault(); addInterest(interestInput); setAddingInterest(false); }}
                className="flex items-center gap-1"
              >
                <Input
                  autoFocus
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onBlur={() => { addInterest(interestInput); setAddingInterest(false); }}
                  maxLength={30}
                  placeholder="Add interest"
                  aria-label="New interest"
                  className="h-10 w-36 rounded-full"
                />
              </form>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={interests.length >= INTERESTS_MAX}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-3.5 py-2 text-[14px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add more
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="app-theme max-h-72 w-56 overflow-y-auto">
                  {INTEREST_SUGGESTIONS
                    .filter((s) => !interests.some((i) => i.toLowerCase() === s.toLowerCase()))
                    .map((suggestion) => (
                      <DropdownMenuItem key={suggestion} onClick={() => addInterest(suggestion)}>
                        <span className="mr-2" aria-hidden>{interestEmoji(suggestion)}</span> {suggestion}
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuItem onClick={() => setAddingInterest(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Something else…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {interests.length} of {INTERESTS_MAX}
          </p>
        </div>

        {/* --------------------------------------------------- availability */}
        <div>
          <SectionLabel optional>When you're usually free</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABILITY_SLOTS.map((slot) => {
              const on = availability.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleAvailability(slot)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* --------------------------------------------------- social links */}
        <div>
          <SectionLabel optional>Social links</SectionLabel>
          <div className="mt-2 space-y-3">
            <div className="relative">
              <Instagram className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-rose-500" />
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram username or link"
                aria-label="Instagram"
                autoCapitalize="none"
                spellCheck={false}
                className="h-14 rounded-2xl pl-11 pr-24 text-[15px]"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                e.g. @arjun_
              </span>
            </div>
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website or other link"
                aria-label="Website"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                className="h-14 rounded-2xl pl-11 pr-24 text-[15px]"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                e.g. https://…
              </span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------- visibility */}
        <div>
          <SectionLabel>Profile visibility</SectionLabel>
          <DropdownMenu>
            <DropdownMenuTrigger className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <VisibilityIcon className="h-5 w-5 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{currentVisibility.label}</span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {currentVisibility.description}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="app-theme w-[min(20rem,calc(100vw-2rem))]">
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = VISIBILITY_ICON[option.key];
                return (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => setVisibility(option.key)}
                    className="items-start gap-2 py-2"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{option.label}</span>
                      <span className="block whitespace-normal text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    {visibility === option.key && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ------------------------------------------------- delete account */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-destructive/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-destructive">Delete account</span>
            <span className="block text-[13px] text-muted-foreground">This action cannot be undone</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-destructive" />
        </button>

        {/* Save is also reachable at the bottom of a long form. */}
        <Button
          type="button"
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={save}
          disabled={saving || uploadingAvatar}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="app-theme sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account</DialogTitle>
            <DialogDescription>
              Deleting a login can't be done from the app — it needs an admin action on the
              server, so milo can't complete it here yet. Send us a deletion request and we'll
              remove your account and everything in it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="gradient" asChild>
              <Link to="/feedback">Request deletion</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditProfileForm;
