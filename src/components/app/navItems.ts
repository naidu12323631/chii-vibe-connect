import { Compass, Home, Map, MessageCircle, User, Video, type LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Which side of the centre "+" button this sits on in the mobile tab bar. */
  side: "left" | "right";
};

// Order matters: the mobile tab bar renders `left` items, the + button, then
// `right` items. "Maps" is the extra tab that sits next to Explore.
export const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, side: "left" },
  { to: "/explore", label: "Explore", icon: Compass, side: "left" },
  { to: "/maps", label: "Maps", icon: Map, side: "left" },
  { to: "/chats", label: "New Chat", icon: MessageCircle, side: "right" },
  { to: "/chat", label: "Video Chat", icon: Video, side: "right" },
  { to: "/profile", label: "Profile", icon: User, side: "right" },
];
