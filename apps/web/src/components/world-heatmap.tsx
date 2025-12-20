import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

function ensureProtocol(url: string | undefined): string {
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

const SERVER_URL = ensureProtocol(import.meta.env.VITE_SERVER_URL);
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface LocationStat {
  countryCode: string;
  country: string | null;
  totalKeystrokes: number;
}

// Map alpha-2 codes to numeric ISO 3166-1 (world-atlas uses numeric IDs)
const alpha2ToNumeric: Record<string, string> = {
  US: "840",
  GB: "826",
  IN: "356",
  DE: "276",
  FR: "250",
  CA: "124",
  AU: "036",
  JP: "392",
  CN: "156",
  BR: "076",
  RU: "643",
  KR: "410",
  IT: "380",
  ES: "724",
  MX: "484",
  NL: "528",
  SE: "752",
  CH: "756",
  PL: "616",
  BE: "056",
  AT: "040",
  NO: "578",
  DK: "208",
  FI: "246",
  IE: "372",
  NZ: "554",
  SG: "702",
  HK: "344",
  TW: "158",
  IL: "376",
  AE: "784",
  SA: "682",
  ZA: "710",
  AR: "032",
  CL: "152",
  CO: "170",
  PH: "608",
  TH: "764",
  MY: "458",
  ID: "360",
  VN: "704",
  PK: "586",
  BD: "050",
  NG: "566",
  EG: "818",
  TR: "792",
  UA: "804",
  CZ: "203",
  PT: "620",
  GR: "300",
  RO: "642",
  HU: "348",
};

function getColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "#1a1a2e";
  const intensity = Math.log(count + 1) / Math.log(maxCount + 1);
  // Gradient from dark blue to bright cyan/green
  const r = Math.round(20 + intensity * 30);
  const g = Math.round(40 + intensity * 200);
  const b = Math.round(80 + intensity * 100);
  return `rgb(${r}, ${g}, ${b})`;
}

export function WorldHeatmap() {
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/stats/locations`);
        if (response.ok) {
          const data = await response.json();
          setLocationStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch location stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxKeystrokes = Math.max(...locationStats.map((s) => s.totalKeystrokes), 1);

  // Create a map of numeric ISO code to keystroke count
  const countryData = new Map<string, number>();
  for (const stat of locationStats) {
    const numericCode = alpha2ToNumeric[stat.countryCode];
    if (numericCode) {
      countryData.set(numericCode, stat.totalKeystrokes);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-dashed border-green-800 bg-black/50">
        <p className="animate-pulse font-mono text-sm text-green-500">
          [ LOADING_GEOSPATIAL_DATA... ]
        </p>
      </div>
    );
  }

  if (locationStats.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-dashed border-green-800 bg-black/50">
        <p className="px-4 text-center font-mono text-sm text-green-600">
          NO_DATA_STREAM // DEPLOY_TO_CLOUDFLARE_TO_ACTIVATE
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-green-900/50 bg-black/50">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [0, 30],
          }}
          height={400}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numericId = geo.id;
                const count = countryData.get(numericId) || 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(count, maxKeystrokes)}
                    stroke="#064e3b"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#4ade80" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Top countries list */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {locationStats.slice(0, 8).map((stat) => (
          <div
            key={stat.countryCode}
            className="flex flex-col justify-between border border-green-900/50 bg-green-900/10 p-2 text-center text-sm transition-colors hover:border-green-700 hover:bg-green-900/20"
          >
            <div className="font-mono font-bold tabular-nums text-green-400">
              {stat.totalKeystrokes.toLocaleString()}
            </div>
            <div className="text-xs text-green-700">{stat.country || stat.countryCode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
