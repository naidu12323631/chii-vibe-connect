import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Renders an avatar image, falling back to the name's initial on a missing or
// broken URL (so a dead storage link never shows an empty broken-image icon).
// The parent element controls size / rounding; this fills it.
const AvatarImg = ({
  url,
  name,
  textClassName,
}: {
  url?: string | null;
  name?: string | null;
  textClassName?: string;
}) => {
  const [errored, setErrored] = useState(false);
  useEffect(() => setErrored(false), [url]);

  const initial = (name?.[0] ?? "U").toUpperCase();

  if (!url || errored) {
    return (
      <div
        className={cn(
          "gradient-primary flex h-full w-full items-center justify-center font-bold text-primary-foreground",
          textClassName,
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name ?? "avatar"}
      onError={() => setErrored(true)}
      className="h-full w-full object-cover"
    />
  );
};

export default AvatarImg;
