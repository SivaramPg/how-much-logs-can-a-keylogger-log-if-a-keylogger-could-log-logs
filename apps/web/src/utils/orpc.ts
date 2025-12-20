import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/api/types";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

const getORPCClient = createIsomorphicFn()
  .server(async () => {
    // Dynamic import to prevent server deps from bundling into client
    const { appRouter } =
      await import("@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/api/routers/index");
    const { createContext } =
      await import("@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/api/context");
    const { createRouterClient } = await import("@orpc/server");

    return createRouterClient(appRouter, {
      context: async ({ req }) => {
        return createContext({ context: req });
      },
    });
  })
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    });

    return createORPCClient(link);
  });

export const client: RouterClient<AppRouter> = getORPCClient() as RouterClient<AppRouter>;

export const orpc = createTanstackQueryUtils(client);
