import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";

// Create a photo post: pick an image (uploaded to the `posts` bucket) + caption.
const NewPostDialog = ({ userId, onCreated }: { userId: string; onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setFile(null); setPreview(null); setCaption("");
  };

  const submit = async () => {
    if (!file) return toast.error("Pick a photo first.");
    setSubmitting(true);
    try {
      const image_url = await uploadImage("posts", userId, file);
      const { error } = await supabase.from("posts").insert({ user_id: userId, image_url, caption: caption || null });
      if (error) throw error;
      toast.success("Posted!");
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm"><Plus className="h-4 w-4" /> New post</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New post</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <button onClick={() => inputRef.current?.click()} className="block w-full overflow-hidden rounded-xl border border-border">
              <img src={preview} alt="preview" className="max-h-72 w-full object-contain bg-black" />
            </button>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-accent"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Choose a photo</span>
            </button>
          )}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
            placeholder="Write a caption..."
          />
          <Button variant="gradient" size="lg" className="w-full" onClick={submit} disabled={submitting || !file}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewPostDialog;
