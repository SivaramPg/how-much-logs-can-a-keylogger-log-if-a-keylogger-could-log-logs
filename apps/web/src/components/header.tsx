import { Link } from "@tanstack/react-router";

import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "/ROOT" },
    { to: "/dashboard", label: "/MONITOR" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-green-800 bg-black/95 text-green-500 backdrop-blur supports-[backdrop-filter]:bg-black/60 font-mono">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-green-400 hover:text-green-300 transition-colors"
          >
            <span className="animate-pulse">_</span>
            <span>KEYLOGGER.SYS</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map(({ to, label }) => {
              return (
                <Link
                  key={to}
                  to={to}
                  className="transition-colors hover:text-green-300 [&.active]:text-green-300 [&.active]:underline [&.active]:decoration-green-500/50 [&.active]:underline-offset-4"
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/SivaramPg/how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-400 transition-colors"
            aria-label="View source on GitHub"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
              />
            </svg>
          </a>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
