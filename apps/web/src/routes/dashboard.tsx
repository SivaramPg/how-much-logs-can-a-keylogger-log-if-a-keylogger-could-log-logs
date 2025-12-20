import { createFileRoute, redirect } from "@tanstack/react-router";

import { LatencyStats } from "@/components/latency-stats";
import { WorldHeatmap } from "@/components/world-heatmap";
import { getUser } from "@/functions/get-user";
import { useLiveStats } from "@/hooks/use-live-stats";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      });
    }
  },
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
  connectionStatus,
}: {
  label: string;
  value?: string | number;
  subtext: string;
  connectionStatus?: boolean;
}) {
  return (
    <div className="relative overflow-hidden border border-green-800 bg-green-900/5 p-6 transition-colors group hover:bg-green-900/10">
      <div className="absolute top-0 right-0 p-2 opacity-50">
        <div
          className={`h-2.5 w-2.5 rounded-full ${connectionStatus === undefined ? "bg-green-500" : connectionStatus ? "bg-green-500" : "bg-red-500"} animate-pulse`}
        ></div>
      </div>
      <div className="mb-2 text-sm tracking-widest uppercase text-green-600 font-bold">{label}</div>
      {value !== undefined && (
        <div className="text-4xl font-black tracking-tighter text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] tabular-nums md:text-5xl">
          {value}
        </div>
      )}
      {connectionStatus !== undefined && (
        <div
          className={`text-4xl font-black tracking-tighter drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] md:text-5xl ${connectionStatus ? "text-green-400" : "text-red-500"}`}
        >
          {connectionStatus ? "ONLINE" : "OFFLINE"}
        </div>
      )}
      <div className="mt-2 text-sm text-green-700 font-medium">{subtext}</div>
    </div>
  );
}

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { stats, isConnected } = useLiveStats();

  return (
    <div className="flex min-h-full flex-col bg-black p-6 font-mono text-green-500 selection:bg-green-900 selection:text-white">
      {/* Header */}
      <div className="mb-8 border-b border-green-900/50 pb-6">
        <h1 className="mb-2 text-5xl font-black tracking-tighter text-green-400 md:text-6xl">
          DASHBOARD<span className="animate-pulse">_</span>
        </h1>
        <p className="text-sm uppercase tracking-widest text-green-700 font-bold md:text-base">
          OPERATOR: <span className="text-green-500">{session?.user.name || "UNKNOWN"}</span> //
          ACCESS_LEVEL: ROOT
        </p>
      </div>

      {/* Live Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatBox
          label="TOTAL_KEYSTROKES"
          value={formatNumber(stats.totalKeystrokes)}
          subtext="Aggregate system throughput"
        />
        <StatBox label="ACTIVE_AGENTS" value={stats.activeUsers} subtext="Connected nodes" />
        <StatBox
          label="SYSTEM_STATUS"
          connectionStatus={isConnected}
          subtext={isConnected ? "Secure uplink established" : "Connection interrupted"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* World Heatmap Panel */}
        <div className="flex flex-col border border-green-800 bg-black shadow-[0_0_30px_rgba(34,197,94,0.05)]">
          <div className="flex items-center justify-between border-b border-green-800 bg-green-900/20 px-6 py-3 backdrop-blur-sm">
            <h2 className="text-base font-bold tracking-widest text-green-400">
              GLOBAL_ACTIVITY_MAP
            </h2>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div className="p-6">
            <WorldHeatmap />
          </div>
        </div>

        {/* Latency Stats Panel */}
        <div className="flex flex-col border border-green-800 bg-black shadow-[0_0_30px_rgba(34,197,94,0.05)]">
          <div className="flex items-center justify-between border-b border-green-800 bg-green-900/20 px-6 py-3 backdrop-blur-sm">
            <h2 className="text-base font-bold tracking-widest text-green-400">LATENCY_ANALYSIS</h2>
            <div className="flex gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            </div>
          </div>
          <div className="p-6">
            <LatencyStats />
          </div>
        </div>
      </div>
    </div>
  );
}
