import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { PlanMessage } from "@/integrations/supabase/types";

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Message = PlanMessage;

const Bubble = ({ name, url }: { name: string | null; url?: string | null }) => {
  const initial = (name ?? "U")[0]?.toUpperCase();
  return url ? (
    <img src={url} alt={name ?? "user"} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
      {initial}
    </div>
  );
};

const PlanChat = ({
  planId,
  currentUserId,
  profilesById,
  canChat,
}: {
  planId: string;
  currentUserId: string;
  profilesById: Record<string, Profile>;
  canChat: boolean;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (!canChat) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("plan_messages")
          .select("id, plan_id, user_id, content, created_at")
          .eq("plan_id", planId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!active) return;
        setMessages(data ?? []);
      } catch (err) {
        if (active) toast.error(err instanceof Error ? err.message : "Could not load chat");
      } finally {
        if (active) {
          setLoading(false);
          scrollToBottom();
        }
      }
    })();

    // Subscribe to new messages for this plan via Postgres change events.
    const channel = supabase
      .channel(`plan-messages:${planId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plan_messages", filter: `plan_id=eq.${planId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          scrollToBottom();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [planId, canChat, scrollToBottom]);

  const send = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      // The realtime subscription appends the new row back (with dedup),
      // so we don't optimistically append here.
      const { error } = await supabase
        .from("plan_messages")
        .insert({ plan_id: planId, user_id: currentUserId, content: text });
      if (error) throw error;
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  if (!canChat) {
    return (
      <div className="text-sm text-muted-foreground p-4 rounded-2xl bg-accent/40">
        Join this plan to chat with the host and other participants.
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-border rounded-2xl bg-background overflow-hidden">
      <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-8">No messages yet. Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === currentUserId;
            const prof = profilesById[m.user_id];
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Bubble name={prof?.display_name ?? m.sender_name ?? null} url={prof?.avatar_url} />
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="text-[11px] text-muted-foreground px-1">
                    {prof?.display_name ?? m.sender_name ?? "Member"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      mine ? "gradient-primary text-primary-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message the group…"
          rows={1}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-[40px] max-h-32 resize-none"
        />
        <Button variant="gradient" size="icon" onClick={send} disabled={sending || !content.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default PlanChat;
