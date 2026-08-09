import { Bell, BellOff, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NotificationsBell = () => {
  const { notifications, unreadCount, markAllRead, clear } = useNotifications();
  const push = usePushNotifications();
  const navigate = useNavigate();

  return (
    <Popover onOpenChange={(open) => { if (open && unreadCount > 0) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {notifications.length > 0 && (
            <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
          )}
        </div>
        {push.supported && (
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-accent/30">
            <div className="min-w-0">
              <div className="text-sm font-medium flex items-center gap-1.5">
                {push.subscribed ? <BellRing className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                Push alerts
              </div>
              <p className="text-[11px] text-muted-foreground">
                {push.status === "denied"
                  ? "Blocked — enable in browser settings"
                  : push.subscribed
                  ? "On — you'll be alerted even when milo is closed"
                  : "Get notified when the app is closed"}
              </p>
            </div>
            {push.status !== "denied" && (
              <Button
                size="sm"
                variant={push.subscribed ? "outline" : "gradient"}
                disabled={push.busy}
                onClick={push.subscribed ? push.disable : push.enable}
              >
                {push.subscribed ? "Off" : "Enable"}
              </Button>
            )}
          </div>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">You're all caught up 🎉</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate(`/plans/${n.plan_id}`)}
                className="w-full text-left px-4 py-3 hover:bg-accent/60 border-b border-border/60 last:border-0"
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full gradient-primary flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{n.sender_name} · {n.plan_title}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
