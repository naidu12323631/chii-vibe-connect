import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlanMessage } from "@/integrations/supabase/types";

type Notification = {
  id: string;
  plan_id: string;
  plan_title: string;
  sender_name: string;
  content: string;
  created_at: string;
  read: boolean;
};

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  unreadByPlan: Record<string, number>;
  markPlanRead: (planId: string) => void;
  markAllRead: () => void;
  clear: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const STORAGE_KEY = "chillout:notifications";

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const locationRef = useRef(location);
  locationRef.current = location;

  // Persist notifications per user
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:${user.id}`);
      if (raw) setNotifications(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}:${user.id}`, JSON.stringify(notifications.slice(-50)));
    } catch { /* ignore */ }
  }, [notifications, user]);

  // Listen for new messages via Supabase Realtime. RLS ("messages_read") only
  // lets a user SELECT messages for plans they belong to, and Realtime honors
  // RLS — so we only receive INSERTs for our own plans. We just skip our own
  // messages and look up the plan title + sender name for the toast.
  useEffect(() => {
    if (!user) return;

    // Small caches so we don't re-query titles/names on every message.
    const titleCache = new Map<string, string>();
    const nameCache = new Map<string, string>();

    const lookupTitle = async (planId: string) => {
      if (titleCache.has(planId)) return titleCache.get(planId)!;
      const { data } = await supabase.from("plans").select("title").eq("id", planId).single();
      const title = data?.title ?? "your plan";
      titleCache.set(planId, title);
      return title;
    };
    const lookupName = async (userId: string) => {
      if (nameCache.has(userId)) return nameCache.get(userId)!;
      const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
      const name = data?.display_name ?? "Someone";
      nameCache.set(userId, name);
      return name;
    };

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plan_messages" },
        async (payload) => {
          const m = payload.new as PlanMessage;
          if (m.user_id === user.id) return; // ignore our own messages

          const match = matchPath("/plans/:id", locationRef.current.pathname);
          const onThisPlan = match?.params?.id === m.plan_id;

          const [plan_title, sender_name] = await Promise.all([
            lookupTitle(m.plan_id),
            lookupName(m.user_id),
          ]);

          const notif: Notification = {
            id: m.id,
            plan_id: m.plan_id,
            plan_title,
            sender_name,
            content: m.content,
            created_at: m.created_at,
            read: onThisPlan,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [...prev, notif].slice(-50);
          });

          if (!onThisPlan) {
            toast(`${sender_name} in ${plan_title}`, {
              description: m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content,
              action: { label: "Open", onClick: () => navigate(`/plans/${m.plan_id}`) },
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  // Auto-mark as read when viewing a plan
  useEffect(() => {
    const match = matchPath("/plans/:id", location.pathname);
    const planId = match?.params?.id;
    if (!planId) return;
    setNotifications((prev) => {
      if (!prev.some((n) => n.plan_id === planId && !n.read)) return prev;
      return prev.map((n) => (n.plan_id === planId ? { ...n, read: true } : n));
    });
  }, [location.pathname]);

  const value = useMemo<NotificationsContextValue>(() => {
    const unread = notifications.filter((n) => !n.read);
    const unreadByPlan: Record<string, number> = {};
    unread.forEach((n) => { unreadByPlan[n.plan_id] = (unreadByPlan[n.plan_id] ?? 0) + 1; });
    return {
      notifications: [...notifications].reverse(),
      unreadCount: unread.length,
      unreadByPlan,
      markPlanRead: (planId) =>
        setNotifications((prev) => prev.map((n) => (n.plan_id === planId ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      clear: () => setNotifications([]),
    };
  }, [notifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};
