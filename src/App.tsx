import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { FeedbackProvider } from "@/hooks/useFeedback";
import AppShell from "./components/app/AppShell.tsx";
import NativeShell from "./components/app/NativeShell.tsx";
import Index from "./pages/Index.tsx";
import VideoChat from "./pages/VideoChat.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/Profile.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import Home from "./pages/Home.tsx";
import Explore from "./pages/Explore.tsx";
import MapsPage from "./pages/MapsPage.tsx";
import Chats from "./pages/Chats.tsx";
import PlanDetail from "./pages/PlanDetail.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Feedback from "./pages/Feedback.tsx";
import NotFound from "./pages/NotFound.tsx";
import SeoPage from "./pages/SeoPage.tsx";

const queryClient = new QueryClient();

const seoSlugs = [
  "omegle-alternative",
  "ometv-alternative",
  "monkey-alternative",
  "ummingle-alternative",
  "random-chat-alternative",
  "meet-people-nearby",
  "make-new-friends",
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <FeedbackProvider>
            <NativeShell />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/chat" element={<VideoChat />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/u/:id" element={<UserProfile />} />
              {/* Signed-in app: shared chrome (sidebar on laptops, tab bar on phones). */}
              <Route element={<AppShell />}>
                <Route path="/app" element={<Home />} />
                <Route path="/plans" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/maps" element={<MapsPage />} />
                <Route path="/chats" element={<Chats />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="/plans/:id" element={<PlanDetail />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/feedback" element={<Feedback />} />
              {seoSlugs.map((slug) => (
                <Route key={slug} path={`/${slug}`} element={<SeoPage slug={slug} />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </FeedbackProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
