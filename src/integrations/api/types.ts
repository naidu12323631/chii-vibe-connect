export type User = {
  id: string;
  email: string;
  display_name: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  availability: string[];
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

export type PlanMessage = {
  id: string;
  plan_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  plan_title?: string;
};

export type AuthResponse = { token: string; user: User };
