import { useState } from "react";
import heroFamily from "@/assets/hero-family.png";
import { cn } from "@/lib/utils";

/** Pure-CSS stand-in used until the illustration file is added. */
const FallbackArt = () => (
  <div className="relative h-28 w-40">
    <span className="absolute right-16 top-0 h-2 w-2 rounded-full bg-primary/40" />
    <span className="absolute right-4 top-3 h-1.5 w-1.5 rounded-full bg-amber-400" />
    <span className="absolute right-24 top-6 h-1.5 w-1.5 rounded-full bg-rose-400" />
    <div className="absolute right-2 top-6 flex h-6 items-center gap-1 rounded-full rounded-br-none bg-primary/15 px-2">
      <span className="h-1 w-1 rounded-full bg-primary" />
      <span className="h-1 w-1 rounded-full bg-primary/70" />
      <span className="h-1 w-1 rounded-full bg-primary/40" />
    </div>
    <div className="absolute right-20 top-10 h-5 w-9 rounded-full rounded-bl-none bg-amber-400/25" />
    <div className="absolute bottom-0 right-0 flex -space-x-2">
      {["👩", "🧑", "👦", "👋"].map((emoji, i) => (
        <span
          key={emoji}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-base ring-2 ring-background",
            ["bg-primary/20", "bg-amber-400/25", "bg-rose-400/25", "bg-emerald-400/25"][i],
          )}
        >
          {emoji}
        </span>
      ))}
    </div>
  </div>
);

/**
 * Decorative artwork in the top-right of the home greeting — the waving family
 * with chat bubbles from the design.
 */
const HeroArt = () => {
  // The bundled illustration; the CSS cluster covers a failed decode.
  const [broken, setBroken] = useState(false);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-0 top-0 origin-top-right select-none scale-[0.78] sm:scale-100"
    >
      {broken ? (
        <FallbackArt />
      ) : (
        <img
          src={heroFamily}
          alt=""
          onError={() => setBroken(true)}
          className="h-28 w-auto max-w-[180px] object-contain object-right-top"
        />
      )}
    </div>
  );
};

export default HeroArt;
