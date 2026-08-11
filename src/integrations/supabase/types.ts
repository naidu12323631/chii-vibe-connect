// Shared app-level types (backed by Supabase tables).

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url?: string | null;
};

/** Who can see a profile. Enforced by RLS in 0011_profile_links.sql. */
export type ProfileVisibility = "public" | "followers" | "private";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  availability: string[];
  // Added by 0011_profile_links.sql — optional so the app still runs before it.
  username?: string | null;
  location?: string | null;
  instagram?: string | null;
  website?: string | null;
  visibility?: ProfileVisibility;
};

export type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  plan_time: string | null;
  max_participants: number;
  created_at: string;
  updated_at?: string;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
};

export type PlanMessage = {
  id: string;
  plan_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  plan_title?: string;
};

/** A one-to-one message. Backed by 0012_direct_messages.sql. */
export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};
