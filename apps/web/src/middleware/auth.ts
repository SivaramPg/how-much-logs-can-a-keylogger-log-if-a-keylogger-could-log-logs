import { createMiddleware } from "@tanstack/react-start";

import { authClient } from "@/lib/auth-client";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    const session = await authClient.getSession({
      fetchOptions: {
        headers: request.headers,
      },
    });
    return next({
      context: { session: session.data },
    });
  } catch (err) {
    console.error("[authMiddleware] Session check failed:", err);
    return next({
      context: { session: null },
    });
  }
});
