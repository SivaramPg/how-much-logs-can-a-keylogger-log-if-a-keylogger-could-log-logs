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
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
