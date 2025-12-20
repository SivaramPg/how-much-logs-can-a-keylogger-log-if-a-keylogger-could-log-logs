import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface LocationStat {
  countryCode: string;
  country: string | null;
  totalKeystrokes: number;
}

// Map alpha-2 codes to alpha-3 for react-simple-maps (uses ISO 3166-1 alpha-3)
const alpha2ToAlpha3: Record<string, string> = {
  US: "USA",
  GB: "GBR",
  IN: "IND",
  DE: "DEU",
  FR: "FRA",
  CA: "CAN",
  AU: "AUS",
  JP: "JPN",
  CN: "CHN",
  BR: "BRA",
  RU: "RUS",
  KR: "KOR",
  IT: "ITA",
  ES: "ESP",
  MX: "MEX",
  NL: "NLD",
  SE: "SWE",
  CH: "CHE",
  PL: "POL",
  BE: "BEL",
  AT: "AUT",
  NO: "NOR",
  DK: "DNK",
  FI: "FIN",
  IE: "IRL",
  NZ: "NZL",
  SG: "SGP",
  HK: "HKG",
  TW: "TWN",
  IL: "ISR",
  AE: "ARE",
  SA: "SAU",
  ZA: "ZAF",
  AR: "ARG",
  CL: "CHL",
  CO: "COL",
  PH: "PHL",
  TH: "THA",
  MY: "MYS",
  ID: "IDN",
  VN: "VNM",
  PK: "PAK",
  BD: "BGD",
  NG: "NGA",
  EG: "EGY",
  TR: "TUR",
  UA: "UKR",
  CZ: "CZE",
  PT: "PRT",
  GR: "GRC",
  RO: "ROU",
  HU: "HUN",
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

  // Create a map of alpha-3 code to keystroke count
  const countryData = new Map<string, number>();
  for (const stat of locationStats) {
    const alpha3 = alpha2ToAlpha3[stat.countryCode] || stat.countryCode;
    countryData.set(alpha3, stat.totalKeystrokes);
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
          projectionConfig={{
            scale: 147,
          }}
          height={400}
        >
          <ZoomableGroup center={[0, 20]} zoom={1}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const alpha3 = geo.properties.ISO_A3 || geo.id;
                  const count = countryData.get(alpha3) || 0;
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
          </ZoomableGroup>
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
