import type { Context as ElysiaContext } from "elysia";

import { auth } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/auth";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
