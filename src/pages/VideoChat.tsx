import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Square, Flag, Send, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Status = "idle" | "searching" | "connected";
type ChatMsg = { id: number; text: string; mine: boolean; time: string };

// Public STUN servers are enough for peer discovery on most networks.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const VideoChat = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);

  // Realtime matchmaking state (serverless, via Supabase Realtime).
  const myId = useRef<string>(crypto.randomUUID());
  const lobbyRef = useRef<RealtimeChannel | null>(null);
  const pairRef = useRef<RealtimeChannel | null>(null);
  const onlineRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef<string | null>(null);
  const partnerRef = useRef<string | null>(null);
  const initiatorRef = useRef(false);
  const offerSentRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  // ---------------------------------------------------------------- WebRTC
  const teardownPeer = useCallback(() => {
    // Close the connection but keep local tracks alive — they're reused next match.
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  // Send a WebRTC signaling payload to the partner over the pair channel.
  const sendSignal = useCallback((payload: unknown) => {
    pairRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const createPeer = useCallback((initiator: boolean) => {
    teardownPeer();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Push our camera/mic tracks to the peer.
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Show the stranger's stream when it arrives.
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Trickle ICE candidates to the peer over the pair channel.
    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ type: "ice", candidate: event.candidate });
    };

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => sendSignal({ type: "offer", sdp: pc.localDescription }))
        .catch(console.error);
    }
    return pc;
  }, [teardownPeer, sendSignal]);

  const handleSignal = useCallback(async (data: any) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: "answer", sdp: pc.localDescription });
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice" && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (err) {
      console.error("[signal]", err);
    }
  }, [sendSignal]);

  // ------------------------------------------------------- matchmaking
  // Tear down the current pair channel + peer connection.
  const leavePair = useCallback(() => {
    teardownPeer();
    offerSentRef.current = false;
    partnerRef.current = null;
    roomRef.current = null;
    if (pairRef.current) {
      supabase.removeChannel(pairRef.current);
      pairRef.current = null;
    }
  }, [teardownPeer]);

  // Open a dedicated broadcast channel with the matched partner and negotiate.
  const startPair = useCallback((partnerId: string, initiator: boolean) => {
    partnerRef.current = partnerId;
    initiatorRef.current = initiator;
    offerSentRef.current = false;

    // Leave the lobby — we're paired now.
    if (lobbyRef.current) {
      supabase.removeChannel(lobbyRef.current);
      lobbyRef.current = null;
    }

    setMessages([]);
    setStatus("connected");

    const name = `video-pair-${[myId.current, partnerId].sort().join("-")}`;
    roomRef.current = name;
    const pair = supabase.channel(name, {
      config: { broadcast: { self: false }, presence: { key: myId.current } },
    });
    pairRef.current = pair;

    pair
      .on("broadcast", { event: "signal" }, ({ payload }) => handleSignal(payload))
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setMessages((m) => [...m, { id: msgId.current++, text: payload.text, mine: false, time: nowTime() }]);
      })
      .on("broadcast", { event: "bye" }, () => handlePartnerLeft())
      .on("presence", { event: "sync" }, () => {
        const count = Object.keys(pair.presenceState()).length;
        // Once both peers are present, the initiator kicks off the WebRTC offer.
        if (count >= 2 && initiatorRef.current && !offerSentRef.current) {
          offerSentRef.current = true;
          createPeer(true);
        }
      })
      .on("presence", { event: "leave" }, () => {
        if (partnerRef.current) handlePartnerLeft();
      })
      .subscribe(async (st) => {
        if (st === "SUBSCRIBED") {
          await pair.track({ at: Date.now() });
          // The responder sets up its peer connection immediately, ready to answer.
          if (!initiator) createPeer(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPeer, handleSignal]);

  // Deterministic pairing: sort waiting peers, pair neighbours. The even-indexed
  // peer invites the next one; the odd-indexed peer accepts. Message-driven
  // commit (offer/ack) avoids both sides pairing with the wrong partner.
  const tryMatch = useCallback(() => {
    const lobby = lobbyRef.current;
    if (!lobby || partnerRef.current) return;
    const ids = Object.keys(lobby.presenceState()).sort();
    const idx = ids.indexOf(myId.current);
    if (idx < 0) return;
    const partnerIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    const partnerId = ids[partnerIdx];
    if (!partnerId) return; // odd one out — keep waiting
    if (idx % 2 === 0) {
      // Invite the partner; commit only when they ack.
      lobby.send({ type: "broadcast", event: "match-offer", payload: { from: myId.current, to: partnerId } });
    }
  }, []);

  // Join the matchmaking lobby and look for a partner.
  const joinLobby = useCallback(() => {
    leavePair();
    setMessages([]);
    setStatus("searching");

    if (lobbyRef.current) {
      supabase.removeChannel(lobbyRef.current);
      lobbyRef.current = null;
    }
    const lobby = supabase.channel("video-lobby", {
      config: { presence: { key: myId.current }, broadcast: { self: false } },
    });
    lobbyRef.current = lobby;

    lobby
      .on("presence", { event: "sync" }, () => tryMatch())
      .on("broadcast", { event: "match-offer" }, ({ payload }) => {
        if (payload.to !== myId.current || partnerRef.current) return;
        // Accept the first invite we receive; become the responder.
        lobby.send({ type: "broadcast", event: "match-ack", payload: { from: myId.current, to: payload.from } });
        startPair(payload.from, false);
      })
      .on("broadcast", { event: "match-ack" }, ({ payload }) => {
        if (payload.to !== myId.current || partnerRef.current) return;
        // Our invite was accepted; become the initiator.
        startPair(payload.from, true);
      })
      .subscribe(async (st) => {
        if (st === "SUBSCRIBED") await lobby.track({ at: Date.now() });
      });
  }, [leavePair, tryMatch, startPair]);

  // Partner skipped/left/disconnected — clean up and requeue.
  const handlePartnerLeft = useCallback(() => {
    leavePair();
    joinLobby();
  }, [leavePair, joinLobby]);

  // ----------------------------------------------- live online counter
  // A page-wide presence channel every visitor joins on mount (regardless of
  // auth or matchmaking status), so the count reflects everyone on /chat now.
  useEffect(() => {
    const online = supabase.channel("video-online", {
      config: { presence: { key: myId.current } },
    });
    onlineRef.current = online;

    const refresh = () => setOnlineCount(Object.keys(online.presenceState()).length);

    online
      .on("presence", { event: "sync" }, refresh)
      .on("presence", { event: "join" }, refresh)
      .on("presence", { event: "leave" }, refresh)
      .subscribe(async (st) => {
        if (st === "SUBSCRIBED") await online.track({ at: Date.now() });
      });

    return () => {
      supabase.removeChannel(online);
      onlineRef.current = null;
    };
  }, []);

  // --------------------------------------------------- media + lobby boot
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setMediaError("Camera & microphone access is needed to video chat. Please allow it and reload.");
        return;
      }
      joinLobby();
    })();

    return () => {
      cancelled = true;
      if (pairRef.current) supabase.removeChannel(pairRef.current);
      if (lobbyRef.current) supabase.removeChannel(lobbyRef.current);
      teardownPeer();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------------------------------------------------- controls
  const handleNext = () => {
    pairRef.current?.send({ type: "broadcast", event: "bye", payload: {} });
    leavePair();
    joinLobby();
  };

  const handleStop = () => {
    pairRef.current?.send({ type: "broadcast", event: "bye", payload: {} });
    leavePair();
    if (lobbyRef.current) {
      supabase.removeChannel(lobbyRef.current);
      lobbyRef.current = null;
    }
    setMessages([]);
    setStatus("idle");
  };

  const handleStart = () => joinLobby();

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || status !== "connected") return;
    pairRef.current?.send({ type: "broadcast", event: "chat", payload: { text } });
    setMessages((m) => [...m, { id: msgId.current++, text, mine: true, time: nowTime() }]);
    setDraft("");
    // Persist to the dedicated table. Each client stores its own sent messages,
    // so the two sides together form the full transcript. Fire-and-forget — a
    // storage hiccup must never block the live chat.
    if (roomRef.current) {
      supabase
        .from("video_chat_messages")
        .insert({ room: roomRef.current, sender_id: myId.current, content: text })
        .then(({ error }) => {
          if (error) console.error("[video chat] store message failed:", error);
        });
    }
  };

  // ----------------------------------------------------------------- view
  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      {/* slim top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <Link to="/" className="text-lg font-extrabold">
          <span className="text-gradient">chillout</span>
        </Link>
        <div
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
          title="People online now"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <Users className="h-4 w-4" />
          <span className="tabular-nums text-foreground">{onlineCount}</span>
          <span className="hidden sm:inline">online</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:flex-row md:gap-3 md:p-3">
        {/* videos: side-by-side row on mobile, stacked 300px column on desktop */}
        <div className="flex w-full shrink-0 flex-row gap-2 md:w-[300px] md:flex-col md:gap-3">
          {/* remote (stranger) */}
          <div className="relative aspect-video flex-1 overflow-hidden rounded-xl bg-neutral-800">
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            {status !== "connected" && (
              <div className="absolute inset-0 grid place-items-center">
                {status === "searching" ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                ) : (
                  <Button variant="gradient" size="sm" onClick={handleStart} disabled={!!mediaError}>
                    Start
                  </Button>
                )}
              </div>
            )}
            <button className="absolute bottom-2 right-2 text-white/70"><Flag className="h-4 w-4" /></button>
          </div>
          {/* local (you) */}
          <div className="relative aspect-video flex-1 overflow-hidden rounded-xl bg-neutral-900">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            {mediaError && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-white/80">
                {mediaError}
              </div>
            )}
          </div>
        </div>

        {/* right: chat */}
        <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {status !== "connected" ? (
              <p className="text-lg font-semibold text-foreground">
                {status === "searching" ? "Searching for someone to chat with.." : "Press Start to begin"}
              </p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're connected! Say hi 👋</p>
            ) : null}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  m.mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* bottom controls: Skip, Stop, input */}
          <form onSubmit={sendMessage} className="flex items-center gap-1.5 border-t border-border p-2 md:gap-2 md:p-3">
            <Button type="button" variant="outline" className="h-11 shrink-0 rounded-lg px-3 font-semibold md:px-6" onClick={handleNext} disabled={!!mediaError}>
              Skip
            </Button>
            <Button type="button" variant="outline" className="h-11 shrink-0 gap-1 rounded-lg px-3 md:px-4" onClick={handleStop} disabled={!!mediaError}>
              <Square className="h-4 w-4" /> <span className="hidden sm:inline">Stop</span>
            </Button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              disabled={status !== "connected"}
              className="h-11 w-0 min-w-0 flex-1 rounded-lg border border-border bg-muted/40 px-4 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
            <Button type="submit" variant="gradient" size="icon" className="h-11 w-11 shrink-0 rounded-lg" disabled={status !== "connected"}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
