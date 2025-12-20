import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

function ensureProtocol(url: string | undefined): string {
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

const SERVER_URL = ensureProtocol(import.meta.env.VITE_SERVER_URL);

interface LatencyStat {
  sessionId: string | null;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  sampleCount: number;
  totalKeystrokes: number;
  countryCode: string | null;
  lastSeen: string | null;
}

function formatLastSeen(timestamp: string | null): string {
  if (!timestamp) return "—";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "—";
    return formatDistanceToNow(date, { addSuffix: true }).toUpperCase().replace(/ /g, "_");
  } catch {
    return "—";
  }
}

function getLatencyColor(latency: number): string {
  if (latency < 50) return "text-green-500";
  if (latency < 100) return "text-yellow-500";
  if (latency < 200) return "text-orange-500";
  return "text-red-500";
}

function getLatencyLabel(latency: number): string {
  if (latency < 50) return "Local";
  if (latency < 100) return "Regional";
  if (latency < 200) return "Continental";
  return "Suspicious";
}

export function LatencyStats() {
  const [stats, setStats] = useState<LatencyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/stats/latency`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch latency stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-dashed border-green-800 bg-black/50">
        <p className="animate-pulse font-mono text-sm text-green-500">
          [ ANALYZING_NETWORK_LATENCY... ]
        </p>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-dashed border-green-800 bg-black/50">
        <p className="font-mono text-sm text-green-600">
          WAITING_FOR_PACKETS // START_TYPING_TO_GENERATE_DATA
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Latency Distribution */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="border border-green-900/50 bg-green-900/5 p-2 transition-colors hover:border-green-700">
          <div className="font-bold text-green-500">{"<50ms"}</div>
          <div className="text-green-700">LOCAL</div>
        </div>
        <div className="border border-green-900/50 bg-green-900/5 p-2 transition-colors hover:border-green-700">
          <div className="font-bold text-yellow-500">50-100ms</div>
          <div className="text-green-700">REGIONAL</div>
        </div>
        <div className="border border-green-900/50 bg-green-900/5 p-2 transition-colors hover:border-green-700">
          <div className="font-bold text-orange-500">100-200ms</div>
          <div className="text-green-700">CONTINENTAL</div>
        </div>
        <div className="border border-green-900/50 bg-green-900/5 p-2 transition-colors hover:border-green-700">
          <div className="font-bold text-red-500">{">200ms"}</div>
          <div className="text-green-700">SUSPICIOUS</div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="overflow-hidden border border-green-900/50">
        <table className="w-full text-sm">
          <thead className="bg-green-900/20 text-xs uppercase tracking-wider text-green-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">SESSION_ID</th>
              <th className="px-3 py-2 text-right font-medium">AVG</th>
              <th className="px-3 py-2 text-right font-medium">MIN</th>
              <th className="px-3 py-2 text-right font-medium">MAX</th>
              <th className="px-3 py-2 text-right font-medium">LAST_SEEN</th>
              <th className="px-3 py-2 text-right font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-900/30">
            {stats.map((stat, index) => (
              <tr
                key={stat.sessionId || index}
                className="text-green-500 hover:bg-green-900/10 transition-colors"
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">
                    {stat.sessionId?.slice(0, 8) || "unknown"}...
                  </span>
                  {stat.countryCode && (
                    <span className="ml-2 text-xs text-green-700">({stat.countryCode})</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono ${getLatencyColor(stat.avgLatency)}`}
                >
                  {stat.avgLatency}ms
                </td>
                <td className="px-3 py-2 text-right font-mono text-green-700">
                  {stat.minLatency}ms
                </td>
                <td className="px-3 py-2 text-right font-mono text-green-700">
                  {stat.maxLatency}ms
                </td>
                <td className="px-3 py-2 text-right font-mono text-green-700 text-xs">
                  {formatLastSeen(stat.lastSeen)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`px-2 py-0.5 text-xs font-bold ${getLatencyColor(stat.avgLatency)}`}
                  >
                    {getLatencyLabel(stat.avgLatency).toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-center text-[10px] text-green-800">
        <p>
          SERVER_LOCATION:{" "}
          <span className="font-medium text-green-600">us-east-1 (N. Virginia)</span>
        </p>
        <p>LATENCY_DELTA = SERVER_TIME - CLIENT_TIME</p>
      </div>
    </div>
  );
}
