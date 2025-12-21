import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

function ensureProtocol(url: string | undefined): string {
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

const SERVER_URL = ensureProtocol(import.meta.env.VITE_SERVER_URL);
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 500;
const STORAGE_KEY = "keylogger_my_keystrokes";
const STORAGE_DEBOUNCE_MS = 1000;

function getStoredCount(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) || 0 : 0;
}

interface KeystrokeCaptureProps {
  onKeystrokeCount?: (count: number) => void;
  onSessionId?: (sessionId: string) => void;
  className?: string;
}

export function KeystrokeCapture({
  onKeystrokeCount,
  onSessionId,
  className,
}: KeystrokeCaptureProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(getStoredCount);
  const keystrokeBuffer = useRef<number>(0);
  const lastFlush = useRef<number>(Date.now());
  const flushTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize anonymous session
  const initSession = useCallback(async () => {
    setError(null);
    try {
      // Check if we already have a session
      const { data: existingSession } = await authClient.getSession();

      // Use existing session if available (structure: { session: { id, token }, user: { id } })
      if (existingSession) {
        const id =
          existingSession.session?.id || existingSession.session?.token || existingSession.user?.id;
        if (id) {
          setSessionId(id);
          setIsReady(true);
          return;
        }
      }

      // Create anonymous session
      const { data, error: authError } = await authClient.signIn.anonymous();

      if (authError) {
        // If already anonymous, try to get the session again
        if (authError.code === "ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY") {
          const { data: retrySession } = await authClient.getSession();
          if (retrySession) {
            const id =
              retrySession.session?.id || retrySession.session?.token || retrySession.user?.id;
            if (id) {
              setSessionId(id);
              setIsReady(true);
              return;
            }
          }
        }
        setError("AUTH_FAILED");
        return;
      }

      if (data) {
        const id = data.session?.id || data.session?.token || data.user?.id;
        if (id) {
          setSessionId(id);
          setIsReady(true);
          return;
        }
      }
      setError("NO_SESSION");
    } catch {
      setError("CONNECTION_ERROR");
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const flushKeystrokes = useCallback(() => {
    if (!sessionId || keystrokeBuffer.current === 0) {
      return;
    }

    const count = keystrokeBuffer.current;
    keystrokeBuffer.current = 0;
    lastFlush.current = Date.now();

    // Fire-and-forget using sendBeacon for reliability
    // Include timestamp for latency calculation
    const payload = JSON.stringify({
      sessionId,
      count,
      timestamp: Date.now(),
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`${SERVER_URL}/keystrokes`, blob);
    } else {
      // Fallback to fetch with keepalive
      fetch(`${SERVER_URL}/keystrokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently ignore errors (fire-and-forget)
      });
    }
  }, [sessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ignore modifier keys alone
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      keystrokeBuffer.current += 1;
      setLocalCount((prev) => prev + 1);

      // Clear any existing timeout
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }

      // Flush if batch size reached
      if (keystrokeBuffer.current >= BATCH_SIZE) {
        flushKeystrokes();
        return;
      }

      // Otherwise, schedule flush after interval
      flushTimeout.current = setTimeout(() => {
        flushKeystrokes();
      }, BATCH_INTERVAL_MS);
    },
    [flushKeystrokes],
  );

  // Notify parent when localCount changes
  useEffect(() => {
    onKeystrokeCount?.(localCount);
  }, [localCount, onKeystrokeCount]);

  // Notify parent when sessionId is set
  useEffect(() => {
    if (sessionId) {
      onSessionId?.(sessionId);
    }
  }, [sessionId, onSessionId]);

  // Debounced persist to localStorage
  const storageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (storageTimeout.current) {
      clearTimeout(storageTimeout.current);
    }
    storageTimeout.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, localCount.toString());
    }, STORAGE_DEBOUNCE_MS);

    return () => {
      if (storageTimeout.current) {
        clearTimeout(storageTimeout.current);
      }
    };
  }, [localCount]);

  // Flush keystrokes and save count on unmount or page hide
  const localCountRef = useRef(localCount);
  localCountRef.current = localCount;

  useEffect(() => {
    const saveAndFlush = () => {
      flushKeystrokes();
      localStorage.setItem(STORAGE_KEY, localCountRef.current.toString());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveAndFlush();
      }
    };

    const handleBeforeUnload = () => {
      saveAndFlush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveAndFlush();
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
    };
  }, [flushKeystrokes]);

  if (error) {
    return (
      <div className="border-red-500/30 border border-dashed p-8 text-center space-y-4">
        <p className="text-red-500 font-mono">[ ERROR: {error} ]</p>
        <button
          onClick={initSession}
          className="px-4 py-2 bg-red-500/20 text-red-500 font-mono text-sm border border-red-500/50 hover:bg-red-500/30 transition-colors"
        >
          RETRY_CONNECTION
        </button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="border-muted-foreground/20 border border-dashed p-8 text-center">
        <p className="text-muted-foreground animate-pulse font-mono">[ INITIALIZING_SESSION... ]</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      <div className="relative group flex-1 flex flex-col">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-50 blur group-hover:opacity-75 transition duration-500"></div>
        <textarea
          className="relative block w-full flex-1 bg-black/90 text-green-500 border border-green-500/50 placeholder:text-green-900/50 min-h-[300px] resize-none p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
          placeholder="> START_TYPING_HERE...
> EVERY_KEYSTROKE_IS_BEING_LOGGED...
> _"
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className="absolute bottom-2 right-2 text-xs font-mono text-green-500/50 pointer-events-none">
          SESSION_ID: {sessionId?.slice(0, 8)}...
        </div>
      </div>
      <div className="flex justify-between items-center text-xs font-mono text-green-500/60 mt-2">
        <span>STATUS: MONITORING</span>
        <span>LOCAL_BUFFER: {keystrokeBuffer.current}</span>
      </div>
    </div>
  );
}
