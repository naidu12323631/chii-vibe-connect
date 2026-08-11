import { Loader2 } from "lucide-react";

// "Continue with Google" button with the official multicolor G mark.
const GoogleButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-background font-semibold transition-colors hover:bg-accent disabled:opacity-60"
  >
    {loading ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.6 29.6 2.7 24 2.7 12.3 2.7 2.7 12.3 2.7 24S12.3 45.3 24 45.3 45.3 35.7 45.3 24c0-1.2-.1-2.3-.3-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.6 29.6 2.7 24 2.7 16 2.7 9.1 7.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 45.3c5.5 0 10.4-1.8 14.1-5l-6.5-5.5c-2 1.5-4.7 2.4-7.6 2.4-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1c2.8 7.3 9.7 11.9 17.8 11.9z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.5c-.5.4 6.9-5 6.9-14.9 0-1.2-.1-2.3-.3-3.5z" />
      </svg>
    )}
    <span>Continue with Google</span>
  </button>
);

export default GoogleButton;
