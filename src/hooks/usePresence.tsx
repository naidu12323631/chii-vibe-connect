import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type PresenceContextValue = {
  /** User ids currently viewing the app (includes you). */
  onlineIds: Set<string>;
  onlineCount: number;
};

const PresenceContext = createContext<PresenceContextValue>({ onlineIds: new Set(), onlineCount: 0 });

/**
 * Tracks who is in the app right now. The presence channel is keyed by user id,
 * so the state doubles as an online-user roster (used by the "Online" filter
 * and the green dots on host avatars).
 */
export const PresenceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnlineIds(new Set());
      return;
    }
    const ch = supabase.channel("app-online", { config: { presence: { key: user.id } } });
    const refresh = () => setOnlineIds(new Set(Object.keys(ch.presenceState())));
    ch.on("presence", { event: "sync" }, refresh)
      .subscribe(async (st) => { if (st === "SUBSCRIBED") await ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineIds, onlineCount: onlineIds.size }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
