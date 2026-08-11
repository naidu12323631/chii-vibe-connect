import type { ProfileVisibility } from "@/integrations/supabase/types";

export const NAME_MAX = 50;
export const BIO_MAX = 150;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const INTERESTS_MAX = 15;

/** Matches the profiles_username_format check constraint in 0011. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

/** Strips a leading @ and anything the constraint would reject. */
export const normaliseUsername = (raw: string) =>
  raw.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._]/g, "");

export type UsernameProblem = "empty" | "short" | "long" | "chars" | null;

export const checkUsernameFormat = (raw: string): UsernameProblem => {
  const value = normaliseUsername(raw);
  if (!value) return "empty";
  if (value.length < USERNAME_MIN) return "short";
  if (value.length > USERNAME_MAX) return "long";
  return USERNAME_PATTERN.test(value) ? null : "chars";
};

export const usernameProblemMessage = (problem: UsernameProblem) => {
  switch (problem) {
    case "empty": return "Pick a username.";
    case "short": return `At least ${USERNAME_MIN} characters.`;
    case "long": return `At most ${USERNAME_MAX} characters.`;
    case "chars": return "Letters, numbers, dots and underscores only.";
    default: return null;
  }
};

/**
 * Accepts "@name", "name", or a full profile URL and stores the bare handle.
 * Keeps what people paste from the Instagram app working.
 */
export const normaliseInstagram = (raw: string) => {
  const value = raw.trim();
  if (!value) return null;
  const fromUrl = value.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (fromUrl ? fromUrl[1] : value).replace(/^@+/, "").replace(/\/+$/, "");
  return handle ? handle.toLowerCase() : null;
};

export const instagramUrl = (handle: string) => `https://instagram.com/${handle.replace(/^@+/, "")}`;

/** Adds https:// when it's missing, and rejects anything that isn't a web URL. */
export const normaliseWebsite = (raw: string): { url: string | null; error?: string } => {
  const value = raw.trim();
  if (!value) return { url: null };
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { url: null, error: "Only http and https links work." };
    }
    if (!parsed.hostname.includes(".")) return { url: null, error: "That doesn't look like a link." };
    return { url: parsed.toString() };
  } catch {
    return { url: null, error: "That doesn't look like a link." };
  }
};

export const VISIBILITY_OPTIONS: {
  key: ProfileVisibility;
  label: string;
  description: string;
}[] = [
  { key: "public", label: "Public", description: "Anyone can see your profile and plans" },
  { key: "followers", label: "Followers only", description: "Only people who follow you can see your profile" },
  { key: "private", label: "Private", description: "Your profile is hidden — you'll show up as “Someone”" },
];

export const visibilityOption = (key: ProfileVisibility | undefined) =>
  VISIBILITY_OPTIONS.find((o) => o.key === key) ?? VISIBILITY_OPTIONS[0];

// Emoji per interest so the chips read like the design. Matched case-insensitively.
const INTEREST_EMOJI: Record<string, string> = {
  coffee: "☕", travel: "🌿", gaming: "🎮", movies: "🎬", adventure: "⛰️", books: "📚",
  music: "🎧", hiking: "🥾", foodie: "🍜", food: "🍜", art: "🎨", photography: "📷",
  fitness: "💪", yoga: "🧘", concerts: "🎤", nightlife: "🌃", "board games": "🎲",
  tech: "💻", coding: "💻", sports: "⚽", pets: "🐾", cooking: "🍳", dancing: "💃",
  reading: "📖", cycling: "🚲", running: "🏃", beach: "🏖️", camping: "🏕️", tea: "🍵",
};

export const interestEmoji = (interest: string) => INTEREST_EMOJI[interest.trim().toLowerCase()] ?? "✨";
