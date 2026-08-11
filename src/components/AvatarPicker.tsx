import { useState } from "react";
import { cn } from "@/lib/utils";

// 3D-rendered avatar packs from the free `alohe/avatars` collection, served
// over the jsDelivr CDN as PNG portraits (the Pixar / memoji look).
const cdn = (prefix: string, n: number) =>
  `https://cdn.jsdelivr.net/gh/alohe/avatars/png/${prefix}_${n}.png`;

const CATEGORIES: { label: string; prefix: string; count: number }[] = [
  { label: "3D", prefix: "3d", count: 5 },
  { label: "Memoji", prefix: "memo", count: 35 },
  { label: "Vibrant", prefix: "vibrent", count: 27 },
  { label: "Toon", prefix: "toon", count: 10 },
];

const AvatarPicker = ({
  value,
  onSelect,
}: {
  value?: string | null;
  onSelect: (url: string) => void;
}) => {
  const [cat, setCat] = useState(CATEGORIES[0]);
  const options = Array.from({ length: cat.count }, (_, i) => cdn(cat.prefix, i + 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              cat.label === c.label ? "border-primary bg-accent" : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
        {options.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onSelect(url)}
            className={cn(
              "aspect-square overflow-hidden rounded-full border-2 bg-muted transition",
              value === url ? "border-primary" : "border-transparent hover:border-border",
            )}
          >
            <img src={url} alt="avatar option" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvatarPicker;
