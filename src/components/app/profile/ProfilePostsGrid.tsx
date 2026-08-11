import { useState } from "react";
import { Bookmark, Heart, Image as ImageIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSavedPosts } from "@/hooks/useLocalPrefs";
import { usePostLikes } from "@/hooks/usePostLikes";
import type { Post } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Three-column post grid with a like count and bookmark on each tile. Likes are
 * stored in `post_likes`; bookmarks are device-local, like saved plans.
 */
const ProfilePostsGrid = ({
  posts,
  canDelete,
  onDelete,
  onCreate,
}: {
  posts: Post[];
  canDelete?: boolean;
  onDelete?: (post: Post) => void;
  onCreate?: () => void;
}) => {
  const [active, setActive] = useState<Post | null>(null);
  const { likes, toggleLike, available } = usePostLikes(posts.map((p) => p.id));
  const { isPostSaved, toggleSavedPost } = useSavedPosts();

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card py-14 text-center">
        <ImageIcon className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
        <h3 className="font-semibold">No posts yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Share a photo from one of your hangouts.</p>
        {onCreate && (
          <Button variant="gradient" size="sm" className="mt-4" onClick={onCreate}>
            Add your first post
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {posts.map((post) => {
          const like = likes[post.id];
          const saved = isPostSaved(post.id);
          return (
            <div key={post.id} className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <button
                onClick={() => setActive(post)}
                className="absolute inset-0"
                aria-label={post.caption ?? "Open post"}
              >
                <img
                  src={post.image_url}
                  alt={post.caption ?? "post"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform hover:scale-[1.03]"
                />
              </button>

              {/* Gradient keeps the overlay legible on bright photos. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />

              {available && (
                <button
                  onClick={() => toggleLike(post.id)}
                  aria-label={like?.liked ? "Unlike" : "Like"}
                  aria-pressed={like?.liked ?? false}
                  className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white transition-transform active:scale-90"
                >
                  <Heart className={cn("h-4 w-4", like?.liked ? "fill-rose-500 text-rose-500" : "fill-white/90 text-white/90")} />
                  <span className="text-[13px] font-bold tabular-nums">{like?.count ?? 0}</span>
                </button>
              )}

              <button
                onClick={() => toggleSavedPost(post.id)}
                aria-label={saved ? "Remove from saved" : "Save post"}
                aria-pressed={saved}
                className="absolute bottom-2 right-2 p-1 text-white transition-transform active:scale-90"
              >
                <Bookmark className={cn("h-4 w-4", saved ? "fill-white text-white" : "text-white/90")} />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="app-theme max-w-lg overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Post</DialogTitle>
          </DialogHeader>
          {active && (
            <div>
              <img
                src={active.image_url}
                alt={active.caption ?? "post"}
                className="max-h-[70vh] w-full bg-black object-contain"
              />
              <div className="flex items-start justify-between gap-3 p-4">
                <p className="text-sm">
                  {active.caption || <span className="text-muted-foreground">No caption</span>}
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  {available && (
                    <button
                      onClick={() => toggleLike(active.id)}
                      className="flex items-center gap-1 text-sm font-semibold"
                      aria-label={likes[active.id]?.liked ? "Unlike" : "Like"}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          likes[active.id]?.liked ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
                        )}
                      />
                      <span className="tabular-nums">{likes[active.id]?.count ?? 0}</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => { onDelete?.(active); setActive(null); }}
                      className="text-destructive hover:opacity-80"
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePostsGrid;
