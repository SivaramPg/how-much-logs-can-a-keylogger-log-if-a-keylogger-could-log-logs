import { useCallback, useEffect, useRef, useState } from "react";

function ensureProtocol(url: string | undefined): string {
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

const SERVER_URL = ensureProtocol(import.meta.env.VITE_SERVER_URL);
const WS_URL = SERVER_URL.replace(/^http/, "ws");
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export interface Stats {
  totalKeystrokes: number;
  activeUsers: number;
  bufferedKeystrokes: number;
}

interface UseLiveStatsReturn {
  stats: Stats;
  isConnected: boolean;
  error: string | null;
}

export function useLiveStats(): UseLiveStatsReturn {
  const [stats, setStats] = useState<Stats>({
    totalKeystrokes: 0,
    activeUsers: 0,
    bufferedKeystrokes: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log("[WebSocket] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "stats" && message.data) {
            setStats(message.data);
          }
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
        }
      };

      ws.onerror = () => {
        setError("Connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttempts.current})`);

          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };
    } catch (err) {
      console.error("[WebSocket] Failed to create connection:", err);
      setError("Failed to connect");
    }
  }, []);

  // Fetch initial stats via HTTP
  useEffect(() => {
    const fetchInitialStats = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("[Stats] Failed to fetch initial stats:", err);
      }
    };

    fetchInitialStats();
  }, []);

  // Connect WebSocket
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { stats, isConnected, error };
}
