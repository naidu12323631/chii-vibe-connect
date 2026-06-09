import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const membershipRef = useRef<Set<string>>(new Set());
  const planTitlesRef = useRef<Record<string, string>>({});
  const profileNamesRef = useRef<Record<string, string>>({});
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

  const refreshMemberships = useCallback(async () => {
    if (!user) return;
    const [{ data: hosted }, { data: joined }] = await Promise.all([
      supabase.from("plans").select("id, title").eq("user_id", user.id),
      supabase.from("plan_participants").select("plan_id, plans(id, title)").eq("user_id", user.id),
    ]);
    const set = new Set<string>();
    const titles: Record<string, string> = {};
    (hosted ?? []).forEach((p: any) => { set.add(p.id); titles[p.id] = p.title; });
    (joined ?? []).forEach((row: any) => {
      if (row.plan_id) set.add(row.plan_id);
      if (row.plans) titles[row.plans.id] = row.plans.title;
    });
    membershipRef.current = set;
    planTitlesRef.current = { ...planTitlesRef.current, ...titles };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshMemberships();

    const msgChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plan_messages" },
        async (payload) => {
          const m = payload.new as { id: string; plan_id: string; user_id: string; content: string; created_at: string };
          if (m.user_id === user.id) return;
          if (!membershipRef.current.has(m.plan_id)) {
            await refreshMemberships();
            if (!membershipRef.current.has(m.plan_id)) return;
          }

          // Suppress if user is viewing that plan's detail page
          const match = matchPath("/plans/:id", locationRef.current.pathname);
          const onThisPlan = match?.params?.id === m.plan_id;

          let title = planTitlesRef.current[m.plan_id];
          if (!title) {
            const { data: p } = await supabase.from("plans").select("title").eq("id", m.plan_id).maybeSingle();
            title = p?.title ?? "your plan";
            planTitlesRef.current[m.plan_id] = title;
          }

          let senderName = profileNamesRef.current[m.user_id];
          if (!senderName) {
            const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", m.user_id).maybeSingle();
            senderName = prof?.display_name ?? "Someone";
            profileNamesRef.current[m.user_id] = senderName;
          }

          const notif: Notification = {
            id: m.id,
            plan_id: m.plan_id,
            plan_title: title,
            sender_name: senderName,
            content: m.content,
            created_at: m.created_at,
            read: onThisPlan,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [...prev, notif].slice(-50);
          });

          if (!onThisPlan) {
            toast(`${senderName} in ${title}`, {
              description: m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content,
              action: { label: "Open", onClick: () => navigate(`/plans/${m.plan_id}`) },
            });
          }
        },
      )
      .subscribe();

    // Refresh memberships when user joins/leaves or creates plans
    const membershipChannel = supabase
      .channel(`notif-memberships-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_participants", filter: `user_id=eq.${user.id}` }, () => refreshMemberships())
      .on("postgres_changes", { event: "*", schema: "public", table: "plans", filter: `user_id=eq.${user.id}` }, () => refreshMemberships())
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(membershipChannel);
    };
  }, [user, navigate, refreshMemberships]);

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
