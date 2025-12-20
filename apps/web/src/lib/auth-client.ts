import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

// Ensure URL has protocol
function ensureProtocol(url: string | undefined): string {
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export const authClient = createAuthClient({
  baseURL: ensureProtocol(import.meta.env.VITE_SERVER_URL),
  plugins: [anonymousClient()],
});
