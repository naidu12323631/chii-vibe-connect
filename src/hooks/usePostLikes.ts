import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LikeState = { count: number; liked: boolean };

/** Postgres error for "relation does not exist" — the migration hasn't run. */
const MISSING_TABLE = "42P01";

/**
 * Like counts for a set of posts, plus whether the signed-in user liked each.
 *
 * Degrades quietly when supabase/migrations/0010_post_likes.sql hasn't been run:
 * counts stay at zero and toggling is a no-op rather than an error, so the rest
 * of the profile keeps working.
 */
export const usePostLikes = (postIds: string[]) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const [available, setAvailable] = useState(true);
  const idKey = [...postIds].sort().join(",");
  // Guards against a stale in-flight load overwriting newer state.
  const loadId = useRef(0);

  useEffect(() => {
    const ids = idKey ? idKey.split(",") : [];
    if (ids.length === 0) {
      setLikes({});
      return;
    }
    const run = ++loadId.current;
    let active = true;

    supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", ids)
      .then(({ data, error }) => {
        if (!active || run !== loadId.current) return;
        if (error) {
          if (error.code === MISSING_TABLE) setAvailable(false);
          return;
        }
        const next: Record<string, LikeState> = {};
        for (const id of ids) next[id] = { count: 0, liked: false };
        for (const row of data ?? []) {
          const entry = next[row.post_id];
          if (!entry) continue;
          entry.count += 1;
          if (row.user_id === user?.id) entry.liked = true;
        }
        setLikes(next);
      });

    return () => { active = false; };
  }, [idKey, user?.id]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user || !available) return;
    const current = likes[postId] ?? { count: 0, liked: false };
    const optimistic: LikeState = {
      liked: !current.liked,
      count: Math.max(0, current.count + (current.liked ? -1 : 1)),
    };
    setLikes((prev) => ({ ...prev, [postId]: optimistic }));

    const { error } = current.liked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });

    if (error) {
      // Roll back so the heart doesn't lie about what's stored.
      setLikes((prev) => ({ ...prev, [postId]: current }));
      if (error.code === MISSING_TABLE) setAvailable(false);
    }
  }, [user, available, likes]);

  return {
    likes,
    toggleLike,
    /** False when the post_likes table is missing, so hearts can be hidden. */
    available,
    countFor: (postId: string) => likes[postId]?.count ?? 0,
    likedBy: (postId: string) => likes[postId]?.liked ?? false,
  };
};
