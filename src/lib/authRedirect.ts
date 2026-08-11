export const getOAuthRedirectUrl = (origin: string) => {
  const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${normalizedOrigin}/app`;
};
