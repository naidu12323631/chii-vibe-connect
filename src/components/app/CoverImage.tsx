import { useEffect, useState } from "react";
import type { Category } from "@/lib/planMeta";
import { categoryByKey } from "@/lib/planMeta";
import { cn } from "@/lib/utils";

const EXTENSIONS = ["jpg", "png", "webp", "jpeg"];

/** "Ulsoor Lake, Bangalore" -> "ulsoor-lake-bangalore" */
export const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const PRESET_PREFIX = "preset:";

/**
 * Cover art for destination / trending / upcoming / nearby cards, in priority
 * order:
 *   1. the plan's own `cover_url` — an uploaded image, or "preset:<vibe>"
 *   2. a photo dropped at `public/covers/<slug>.<ext>`
 *   3. the category gradient with a watermark icon
 *
 * So the UI is complete with no image files present, and any single cover can be
 * replaced by adding one.
 */
const CoverImage = ({
  slug,
  category,
  coverUrl,
  className,
  iconClassName,
}: {
  slug: string;
  category: Category;
  coverUrl?: string | null;
  className?: string;
  iconClassName?: string;
}) => {
  const preset = coverUrl?.startsWith(PRESET_PREFIX)
    ? categoryByKey(coverUrl.slice(PRESET_PREFIX.length))
    : null;
  const uploaded = coverUrl && !preset ? coverUrl : null;

  // -1 means "try the uploaded cover"; 0+ walks the public/covers extensions.
  const [attempt, setAttempt] = useState(uploaded ? -1 : 0);
  useEffect(() => setAttempt(uploaded ? -1 : 0), [slug, uploaded]);

  const art = preset ?? category;
  const src = attempt < 0 ? uploaded : `/covers/${slug}.${EXTENSIONS[attempt]}`;
  // A preset explicitly asks for the gradient, so don't go looking for files.
  const exhausted = (!!preset && !uploaded) || attempt >= EXTENSIONS.length;

  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br", art.cover, className)}>
      {exhausted ? (
        <art.icon
          className={cn("absolute right-2 top-2 h-10 w-10 text-white/25", iconClassName)}
          strokeWidth={1.5}
        />
      ) : (
        <img
          src={src ?? undefined}
          alt=""
          loading="lazy"
          onError={() => setAttempt((a) => (a < 0 ? 0 : a + 1))}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
};

export default CoverImage;
