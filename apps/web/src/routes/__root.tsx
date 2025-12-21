import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import type { QueryClient } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@/components/ui/sonner";

import Header from "../components/header";
import appCss from "../index.css?url";

export interface RouterAppContext {
  queryClient: QueryClient;
}

const siteConfig = {
  title: "KEYLOGGER - Type more, climb higher, get snooped harder",
  description:
    "A global keystroke leaderboard. Compete to be the most watched. No actual keys are logged - only counts. Inspired by Amazon's latency detection protocol.",
  url: "https://how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs.sivaramp.com",
  image:
    "https://how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs.sivaramp.com/opengraph-image.png",
  creator: "@SivaramPg",
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteConfig.title },
      { name: "description", content: siteConfig.description },
      { name: "author", content: "Sivaram" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#000000" },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:url", content: siteConfig.url },
      { property: "og:title", content: siteConfig.title },
      { property: "og:description", content: siteConfig.description },
      { property: "og:image", content: siteConfig.image },
      { property: "og:site_name", content: "KEYLOGGER" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: siteConfig.creator },
      { name: "twitter:creator", content: siteConfig.creator },
      { name: "twitter:title", content: siteConfig.title },
      { name: "twitter:description", content: siteConfig.description },
      { name: "twitter:image", content: siteConfig.image },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "canonical", href: siteConfig.url },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
          <Header />
          <Outlet />
          <footer className="border-t border-green-900/30 bg-black px-4 py-3 text-center font-mono text-xs text-green-800">
            Created by{" "}
            <a
              href="https://sivaramp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 underline decoration-green-800 underline-offset-2 transition-colors hover:text-green-400 hover:decoration-green-400"
            >
              Sivaram
            </a>
          </footer>
        </div>
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
