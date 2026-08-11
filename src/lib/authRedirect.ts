// Return the OAuth redirect URL. Prefer an explicit env var when provided,
// otherwise fall back to the Vercel app host used in production.
export const getOAuthRedirectUrl = (origin?: string) => {
  const env = (import.meta.env.VITE_OAUTH_REDIRECT as string | undefined) || undefined;
  if (env) {
    const cleaned = env.endsWith("/") ? env.slice(0, -1) : env;
    return cleaned.endsWith("/app") ? cleaned : `${cleaned}/app`;
  }

  // Fixed production host requested by the user.
  return "https://miloumingle.vercel.app/app";
};
