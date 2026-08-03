import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Square, Flag, Send, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import FeedbackDialog from "@/components/FeedbackDialog";

const ANON_FEEDBACK_KEY = "chillout:feedback:anon";
const ANON_FEEDBACK_FIRST_MS = 30 * 1000;
const ANON_FEEDBACK_INTERVAL_MS = 5 * 60 * 1000;

type Status = "idle" | "searching" | "connected";
type ChatMsg = { id: number; text: string; mine: boolean; time: string };

type Country = { code: string; name: string; flag: string };
type PartnerInfo = { country: string; flag: string; interests: string[] };
type PresenceMeta = { at?: number; interests: string[]; country: string; flag: string };
type SignalPayload = { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

// Public STUN servers are enough for peer discovery on most networks.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const COUNTRIES: Country[] = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
];

// Best-guess home country from the browser locale (falls back to India).
const detectCountry = (): Country => {
  try {
    const region = navigator.language.split("-")[1]?.toUpperCase();
    if (region && region.length === 2) {
      const known = COUNTRIES.find((c) => c.code === region);
      if (known) return known;
      const name = new Intl.DisplayNames(["en"], { type: "region" }).of(region);
      const flag = String.fromCodePoint(...[...region].map((ch) => 127397 + ch.charCodeAt(0)));
      return { code: region, name: name ?? region, flag };
    }
  } catch { /* ignore */ }
  return { code: "IN", name: "India", flag: "🇮🇳" };
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

  // Pre-call preferences (interests drive matchmaking; country is just shown).
  const interestsRef = useRef<string[]>([]);
  const countryRef = useRef<Country>(detectCountry());
  const [setupDone, setSetupDone] = useState(false);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [myCountry, setMyCountry] = useState<Country>(detectCountry());

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
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);

  // ---- Anonymous feedback: prompt signed-out users every 5 min (until filled).
  const { user } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  useEffect(() => {
    if (user) return;
    try {
      if (localStorage.getItem(ANON_FEEDBACK_KEY) === "1") setFeedbackDone(true);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (user || feedbackDone) return;
    const prompt = () => setFeedbackOpen(true);
    const first = setTimeout(prompt, ANON_FEEDBACK_FIRST_MS);
    const interval = setInterval(prompt, ANON_FEEDBACK_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [user, feedbackDone]);

  const handleAnonFeedbackSubmitted = () => {
    try { localStorage.setItem(ANON_FEEDBACK_KEY, "1"); } catch { /* ignore */ }
    setFeedbackDone(true);
    setFeedbackOpen(false);
  };

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

  const handleSignal = useCallback(async (data: SignalPayload) => {
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
    setPartnerInfo(null);
    if (pairRef.current) {
      supabase.removeChannel(pairRef.current);
      pairRef.current = null;
    }
  }, [teardownPeer]);

  // Open a dedicated broadcast channel with the matched partner and negotiate.
  const startPair = useCallback((partnerId: string, initiator: boolean, meta?: PartnerInfo) => {
    partnerRef.current = partnerId;
    initiatorRef.current = initiator;
    offerSentRef.current = false;
    setPartnerInfo(meta ?? null);

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

  // Interest-based matching: only pair with a peer sharing at least one of the
  // typed interests (case-insensitive). The peer with the lower id initiates,
  // so both sides never invite each other.
  const tryMatch = useCallback(() => {
    const lobby = lobbyRef.current;
    if (!lobby || partnerRef.current) return;
    const state = lobby.presenceState() as unknown as Record<string, PresenceMeta>;
    const ids = Object.keys(state)
      .filter((id) => id !== myId.current)
      .sort();

    const norm = (s: string) => s.trim().toLowerCase();
    const sharedWith = (them: PresenceMeta | undefined) => {
      if (!them?.interests) return 0;
      const theirs = them.interests.map(norm);
      return (interestsRef.current ?? []).filter((i) => theirs.includes(norm(i))).length;
    };

    const candidates = ids
      .map((id) => ({ id, n: sharedWith(state[id]) }))
      .filter((c) => c.n > 0)
      .sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1));
    if (!candidates.length) return;

    const best = candidates[0];
    if (myId.current < best.id) {
      const meta: PresenceMeta = {
        interests: interestsRef.current,
        country: countryRef.current.name,
        flag: countryRef.current.flag,
      };
      lobby.send({
        type: "broadcast",
        event: "match-offer",
        payload: { from: myId.current, to: best.id, meta },
      });
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
        const meta: PresenceMeta = {
          interests: interestsRef.current,
          country: countryRef.current.name,
          flag: countryRef.current.flag,
        };
        lobby.send({ type: "broadcast", event: "match-ack", payload: { from: myId.current, to: payload.from, meta } });
        startPair(payload.from, false, payload.meta);
      })
      .on("broadcast", { event: "match-ack" }, ({ payload }) => {
        if (payload.to !== myId.current || partnerRef.current) return;
        // Our invite was accepted; become the initiator.
        startPair(payload.from, true, payload.meta);
      })
      .subscribe(async (st) => {
        if (st === "SUBSCRIBED") {
          await lobby.track({
            at: Date.now(),
            interests: interestsRef.current,
            country: countryRef.current.name,
            flag: countryRef.current.flag,
          });
        }
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

  // --------------------------------------------------- media boot (no auto-match)
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

  // The local <video> only mounts after the setup screen is dismissed. Attach
  // the captured stream the moment the element is available (and on setup).
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [setupDone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------------------------------------------------- controls
  const addInterest = () => {
    const tag = interestInput.trim();
    if (!tag) return;
    if (myInterests.some((i) => i.toLowerCase() === tag.toLowerCase())) return;
    setMyInterests((prev) => [...prev, tag]);
    setInterestInput("");
  };

  const removeInterest = (tag: string) =>
    setMyInterests((prev) => prev.filter((i) => i.toLowerCase() !== tag.toLowerCase()));

  const handleSetupStart = () => {
    if (myInterests.length === 0) return;
    interestsRef.current = myInterests;
    countryRef.current = myCountry;
    setSetupDone(true);
    joinLobby();
  };

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

  const sharedInterests =
    partnerInfo && setupDone
      ? (interestsRef.current ?? []).filter((i) =>
          (partnerInfo.interests ?? []).some((t) => t.toLowerCase() === i.toLowerCase()),
        )
      : [];

  // ----------------------------------------------------------------- view
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
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

      {!setupDone ? (
        // ------------------------------------------------------ PRE-CALL SETUP
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-xl">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold tracking-tight">
                Before we match you <span className="text-gradient">✨</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Type your interests — we'll match you with people who share them.
                Your country ({myCountry.flag} {myCountry.name}) is detected automatically and shown to your partner after connecting.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">My interests</label>
              <p className="text-xs text-muted-foreground">
                Type what you're into and press Enter to add. We'll match you only with people who share it.
              </p>
              <div className="flex gap-2">
                <input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addInterest(); }
                    if (e.key === ",") { e.preventDefault(); addInterest(); }
                  }}
                  placeholder="e.g. rock climbing"
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <Button type="button" variant="outline" onClick={addInterest}>
                  Add
                </Button>
              </div>
              {myInterests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {myInterests.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => removeInterest(i)}
                      className="group inline-flex items-center gap-1.5 rounded-full gradient-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                      title="Remove"
                    >
                      {i}
                      <span className="opacity-70 group-hover:opacity-100">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button variant="gradient" size="lg" className="w-full" onClick={handleSetupStart} disabled={myInterests.length === 0}>
              {myInterests.length === 0 ? "Pick at least one interest" : "Start chatting"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:flex-row md:gap-3 md:p-3">
          {/*
            Mobile: big remote video with your camera as a floating PIP (top-right).
            Desktop (md+): two stacked tiles in a 300px column (the original layout).
            One set of <video> elements, reshaped with responsive classes.
          */}
          <div className="relative h-[42vh] w-full shrink-0 md:flex md:h-auto md:w-[300px] md:flex-col md:gap-3">
            {/* remote (stranger) — fills the frame on mobile, a tile on desktop */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-neutral-800 md:relative md:inset-auto md:aspect-video md:flex-1 md:rounded-xl">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

              {/* partner banner: country + shared interests */}
              {status === "connected" && partnerInfo && (
                <div className="absolute inset-x-0 top-0 rounded-t-2xl bg-gradient-to-b from-black/70 to-transparent p-3 text-white md:rounded-t-xl">
                  <p className="text-xs font-semibold">
                    You're speaking with someone from {partnerInfo.flag} {partnerInfo.country}
                  </p>
                  {sharedInterests.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-white/85">
                      You both like {sharedInterests.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {(status !== "connected" || mediaError) && (
                <div className="absolute inset-0 grid place-items-center bg-neutral-900/70 p-6 text-center">
                  {mediaError ? (
                    <p className="max-w-xs text-sm text-white/85">{mediaError}</p>
                  ) : status === "searching" ? (
                    <div className="flex flex-col items-center gap-3 text-white/85">
                      <Loader2 className="h-9 w-9 animate-spin" />
                      <span className="text-sm font-medium">Finding someone who shares your interests…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Button variant="gradient" size="lg" onClick={handleStart} disabled={!!mediaError}>
                        Start chatting
                      </Button>
                      <button
                        className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
                        onClick={() => setSetupDone(false)}
                      >
                        Change interests
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button className="absolute bottom-3 right-3 rounded-full bg-black/40 p-2 text-white/80 backdrop-blur hover:text-white" title="Report">
                <Flag className="h-4 w-4" />
              </button>
            </div>

            {/* local (you) — floating PIP on mobile, stacked tile on desktop */}
            <div className="absolute right-3 top-3 h-28 w-20 overflow-hidden rounded-xl border-2 border-white/70 bg-neutral-900 shadow-lg sm:h-32 sm:w-24 md:relative md:right-auto md:top-auto md:aspect-video md:h-auto md:w-full md:flex-1 md:rounded-xl md:border-0 md:shadow-none">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
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
      )}

      {/* Signed-out users get a feedback prompt every 5 min until they fill it. */}
      {!user && (
        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} onSubmitted={handleAnonFeedbackSubmitted} />
      )}
    </div>
  );
};

export default VideoChat;