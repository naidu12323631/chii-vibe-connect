import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AvatarImg from "@/components/AvatarImg";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import type { DirectMessage, Profile } from "@/integrations/supabase/types";
import { onlinePeers, pickRandomPeer } from "@/lib/dm";
import { cn } from "@/lib/utils";

/**
 * A one-to-one thread with someone in your follow circle. Reached from Chats,
 * which picks the person at random — there's no directory to browse.
 */
const DirectChat = () => {
  const { id: peerId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { onlineIds } = usePresence();
  const navigate = useNavigate();

  const [peer, setPeer] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  // Load the peer profile and the thread so far.
  useEffect(() => {
    if (!user || !peerId) return;
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const [profileRes, messageRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", peerId).maybeSingle(),
          supabase
            .from("direct_messages")
            .select("id, sender_id, recipient_id, content, created_at")
            .or(
              `and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),` +
                `and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`,
            )
            .order("created_at", { ascending: true }),
        ]);
        if (!active) return;
        if (messageRes.error) throw messageRes.error;

        setPeer((profileRes.data as Profile) ?? null);
        setMessages((messageRes.data as DirectMessage[]) ?? []);
      } catch (err) {
        if (active) toast.error(err instanceof Error ? err.message : "Could not load this chat");
      } finally {
        if (active) {
          setLoading(false);
          scrollToBottom();
        }
      }
    })();

    return () => { active = false; };
  }, [user, peerId, scrollToBottom]);

  // Live delivery. The filter only matches rows they send to us; our own sends
  // come back on the same channel, so both sides stay in sync.
  useEffect(() => {
    if (!user || !peerId) return;
    const channel = supabase
      .channel(`dm:${[user.id, peerId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DirectMessage;
          const inThread =
            (m.sender_id === user.id && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === user.id);
          if (!inThread) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          scrollToBottom();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, peerId, scrollToBottom]);

  const send = async () => {
    const text = content.trim();
    if (!text || sending || !user || !peerId) return;
    setSending(true);
    try {
      // Realtime echoes the row back (with dedup), so no optimistic append.
      const { error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: user.id, recipient_id: peerId, content: text });
      if (error) throw error;
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  // Jump to a different random person, skipping whoever we're talking to now.
  const shuffle = () => {
    if (!user) return;
    const others = onlinePeers(onlineIds, user.id).filter((id) => id !== peerId);
    const next = pickRandomPeer(others, []);
    if (!next) {
      toast.info("Nobody else is online right now — try again in a moment.");
      return;
    }
    navigate(`/dm/${next}`);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const peerName = peer?.display_name ?? "Someone";

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] w-full max-w-3xl flex-col">
      {/* ------------------------------------------------------------- header */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/chats" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Link to={`/u/${peerId}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full">
              <AvatarImg url={peer?.avatar_url} name={peer?.display_name} />
            </div>
            {peerId && onlineIds.has(peerId) && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
            )}
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{peerName}</span>
            <span className="block text-xs text-muted-foreground">
              {peerId && onlineIds.has(peerId) ? "Online now" : "Tap to view profile"}
            </span>
          </span>
        </Link>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={shuffle}>
          <Shuffle className="h-4 w-4" />
          <span className="hidden sm:inline">Someone else</span>
        </Button>
      </div>

      {/* ------------------------------------------------------------ messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            You matched with {peerName}. Say hi 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className="flex max-w-[75%] flex-col">
                  <div className={cn("px-1 text-[11px] text-muted-foreground", mine && "text-right")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "gradient-primary rounded-tr-sm text-primary-foreground"
                        : "rounded-tl-sm bg-accent",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------ composer */}
      <div className="flex items-end gap-2 border-t border-border pt-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${peerName}…`}
          rows={1}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="max-h-32 min-h-[40px] resize-none"
        />
        <Button variant="gradient" size="icon" onClick={send} disabled={sending || !content.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default DirectChat;
