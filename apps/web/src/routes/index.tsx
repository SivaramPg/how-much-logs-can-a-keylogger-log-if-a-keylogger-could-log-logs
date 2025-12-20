import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { KeystrokeCapture } from "@/components/keystroke-capture";
import { useLiveStats } from "@/hooks/use-live-stats";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  ssr: false,
});

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function StatBox({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="border border-green-800 bg-green-900/5 p-4 relative overflow-hidden group hover:bg-green-900/10 transition-colors">
      <div className="absolute top-0 right-0 p-1 opacity-50">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>
      <div className="text-sm text-green-600 uppercase tracking-widest mb-1 font-bold">{label}</div>
      <div className="text-4xl md:text-5xl font-black tabular-nums tracking-tighter text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
        {value}
      </div>
      {subtext && <div className="text-sm text-green-700 mt-1">{subtext}</div>}
    </div>
  );
}

function HomeComponent() {
  const { stats, isConnected, error } = useLiveStats();
  const [myKeystrokes, setMyKeystrokes] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toISOString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-black p-4 font-mono text-green-500 selection:bg-green-900 selection:text-white">
      {/* Top System Bar */}
      <div className="mb-6 flex flex-col justify-between border-b border-green-900/50 pb-2 text-[10px] opacity-70 gap-2 md:flex-row md:text-xs">
        <div className="flex gap-4">
          <span>
            SYS.OP.STATUS: <span className="text-green-300">NORMAL</span>
          </span>
          <span>KERNEL: v5.19.0-42</span>
        </div>
        <div className="flex gap-4">
          <span>
            ENC: <span className="text-green-300">AES-256</span>
          </span>
          <span className="tabular-nums">TIME: {currentTime}</span>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Stats & Info (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Banner / Title */}
          <div className="group relative overflow-hidden border border-green-800 bg-black p-4 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50 transition-opacity group-hover:opacity-100"></div>
            <div className="flex items-baseline gap-2">
              <h1
                className="text-5xl font-black tracking-tighter text-green-500 md:text-6xl glitch-text"
                data-text="KEYLOGGER"
              >
                KEYLOGGER
              </h1>
              <span className="animate-pulse text-green-600 text-5xl">_</span>
            </div>
            <div className="mt-2 border-t border-green-900/50 pt-2">
              <p className="border-l-2 border-green-600 pl-3 text-xs italic text-green-400">
                "How much logs can a keylogger log if a keylogger could log logs?"
              </p>
            </div>
          </div>

          {/* Global Metrics Panel */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-green-900/50 pb-1">
              <div className="h-2 w-2 bg-green-500"></div>
              <h3 className="text-base font-bold tracking-widest">GLOBAL_METRICS</h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <StatBox
                label="TOTAL_LOGGED_KEYS"
                value={formatNumber(stats.totalKeystrokes)}
                subtext="Global aggregate across all nodes"
              />
              <StatBox
                label="ACTIVE_NODES"
                value={stats.activeUsers}
                subtext="Currently connected agents"
              />
              <StatBox
                label="LOCAL_BUFFER"
                value={formatNumber(myKeystrokes)}
                subtext="Session contribution"
              />
            </div>
          </div>

          {/* Uplink Status */}
          <div
            className={`border border-green-900 p-4 transition-colors ${isConnected ? "bg-green-900/10" : "bg-red-900/10 border-red-900"}`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} relative z-10`}
                ></div>
                <div
                  className={`absolute inset-0 w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-ping opacity-75`}
                ></div>
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-bold tracking-wider ${isConnected ? "text-green-400" : "text-red-400"}`}
                >
                  {isConnected ? "UPLINK_ESTABLISHED" : "CONNECTION_LOST"}
                </span>
                <span className="text-[10px] text-green-700">
                  {error
                    ? `ERR: ${error}`
                    : isConnected
                      ? "Data stream active"
                      : "Attempting reconnect..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Terminal (8 cols) */}
        <div className="flex min-h-[500px] flex-col lg:col-span-8 lg:h-auto">
          <div className="relative flex h-full flex-col border border-green-800 bg-black shadow-[0_0_30px_rgba(34,197,94,0.05)]">
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between border-b border-green-800 bg-green-900/20 p-2 backdrop-blur-sm">
              <div className="flex gap-1.5 pl-2">
                <div className="h-2.5 w-2.5 rounded-full border border-red-600/50 bg-red-500/80"></div>
                <div className="h-2.5 w-2.5 rounded-full border border-yellow-600/50 bg-yellow-500/80"></div>
                <div className="h-2.5 w-2.5 rounded-full border border-green-600/50 bg-green-500/80"></div>
              </div>
              <div className="text-[10px] font-mono tracking-wider text-green-600 md:text-xs">
                root@keylogger-v1.0:~/capture-mode
              </div>
              <div className="w-10"></div> {/* Spacer for balance */}
            </div>

            {/* Terminal Content */}
            <div className="relative flex-1 bg-black/50 p-1">
              {/* Grid overlay effect */}
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
              <div className="relative z-10 h-full">
                <KeystrokeCapture onKeystrokeCount={setMyKeystrokes} className="h-full" />
              </div>
            </div>

            {/* Terminal Footer */}
            <div className="flex items-center justify-between border-t border-green-900/50 bg-green-900/10 px-3 py-1 text-[10px] text-green-600">
              <span>MODE: INSERT</span>
              <span>UTF-8</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="cursor-help text-[10px] text-green-800 transition-colors hover:text-green-600">
              Inspired by{" "}
              <a
                href="https://www.bloomberg.com/news/newsletters/2025-12-17/amazon-caught-north-korean-it-worker-by-tracing-keystroke-data"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-green-800 underline-offset-2 hover:text-green-400 hover:decoration-green-400"
              >
                Amazon's Latency Detection Protocol
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
