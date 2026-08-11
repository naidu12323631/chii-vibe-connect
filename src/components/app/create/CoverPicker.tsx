import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { coverCategory, isPresetCover, presetCover, PRESET_COVERS } from "./planDraft";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * "Add a cover": an upload tile plus the built-in gradient presets. Uploads go
 * to the public `covers` bucket; presets are stored as "preset:<vibe>" and need
 * no file at all.
 */
const CoverPicker = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (cover: string | null) => void;
}) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadedPreview = value && !isPresetCover(value) ? value : null;

  const pick = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadImage("covers", user.id, file));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload that image";
      toast.error(
        /bucket/i.test(message)
          ? "The 'covers' storage bucket doesn't exist yet. Run supabase/migrations/0009_plan_cover.sql."
          : message,
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <h3 className="text-[15px] font-bold">
        Add a cover <span className="font-normal text-muted-foreground">(optional)</span>
      </h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground">A cover makes your plan stand out!</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      <div className="no-scrollbar -mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {/* ------------------------------------------------------ upload tile */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex h-[104px] w-[130px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed transition-colors",
            uploadedPreview
              ? "border-primary bg-primary/5"
              : "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10",
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : uploadedPreview ? (
            <img src={uploadedPreview} alt="" className="h-full w-full rounded-xl object-cover" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-primary" />
              <span className="text-[13px] font-semibold text-primary">Upload</span>
            </>
          )}
        </button>

        {/* --------------------------------------------------------- presets */}
        {PRESET_COVERS.map((category) => {
          const key = presetCover(category);
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(selected ? null : key)}
              aria-pressed={selected}
              aria-label={`${category.label} cover`}
              className={cn(
                "relative h-[104px] w-[130px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br transition-transform hover:scale-[1.02]",
                category.cover,
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <category.icon className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/70" strokeWidth={1.5} />
              <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white/90">{category.label}</span>
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <Check className="h-3 w-3 text-primary" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Remove cover
        </button>
      )}
      {isPresetCover(value) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Using the {coverCategory(value).label} gradient cover.
        </p>
      )}
    </div>
  );
};

export default CoverPicker;
