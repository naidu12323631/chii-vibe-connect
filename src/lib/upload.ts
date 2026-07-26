// Upload an image to a public Supabase Storage bucket and return its public URL.
// Files live under "<userId>/<random>.<ext>" so the storage RLS policies (which
// check the first path segment == auth.uid()) allow the write.
import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(
  bucket: "avatars" | "posts",
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
