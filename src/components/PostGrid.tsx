import { useState } from "react";
import type { Post } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, Trash2 } from "lucide-react";

// Instagram-style 3-column post grid. Tapping a tile opens it full-size.
// When `canDelete` is set, the owner sees a delete action in the viewer.
const PostGrid = ({
  posts,
  canDelete,
  onDelete,
}: {
  posts: Post[];
  canDelete?: boolean;
  onDelete?: (post: Post) => void;
}) => {
  const [active, setActive] = useState<Post | null>(null);

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <ImageIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm">No posts yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="relative aspect-square overflow-hidden rounded-md bg-muted"
          >
            <img
              src={p.image_url}
              alt={p.caption ?? "post"}
              className="h-full w-full object-cover transition hover:opacity-90"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
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
                {canDelete && (
                  <button
                    onClick={() => { onDelete?.(active); setActive(null); }}
                    className="shrink-0 text-destructive hover:opacity-80"
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostGrid;
