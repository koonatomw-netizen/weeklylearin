import { useEffect, useState } from "react";
import { ApiError, createSocketTicket, getRoom } from "./api";
import type { RoomEnvelope } from "./shared/types";

/**
 * Live room state: WebSocket push from the Durable Object, with short polling while
 * the socket is down so phones on flaky Wi-Fi still follow the presenter.
 */
export function useRoom(code: string, token: string | null) {
  const [room, setRoom] = useState<RoomEnvelope | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!code || !token) return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let pingTimer = 0;
    let pollTimer = 0;
    let attempts = 0;

    const refresh = async () => {
      try {
        const next = await getRoom(code, token);
        if (!disposed) { setRoom(next); setError(""); }
      } catch (caught) {
        if (disposed) return;
        if (caught instanceof ApiError && caught.status === 401) { setExpired(true); return; }
        setError(caught instanceof Error ? caught.message : "Room connection failed.");
      }
    };

    const startPolling = () => {
      if (!pollTimer) pollTimer = window.setInterval(() => void refresh(), 3_000);
    };
    const stopPolling = () => { window.clearInterval(pollTimer); pollTimer = 0; };

    const connect = async () => {
      if (disposed) return;
      try {
        await refresh();
        const { ticket } = await createSocketTicket(code, token);
        if (disposed) return;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const next = new WebSocket(`${protocol}//${window.location.host}/api/rooms/${encodeURIComponent(code)}/ws?ticket=${encodeURIComponent(ticket)}`);
        socket = next;
        next.onopen = () => {
          attempts = 0;
          setConnected(true);
          setError("");
          stopPolling();
          pingTimer = window.setInterval(() => next.readyState === WebSocket.OPEN && next.send("ping"), 25_000);
        };
        next.onmessage = (event) => {
          if (event.data === "pong") return;
          try {
            const message = JSON.parse(event.data) as { type?: string } & RoomEnvelope;
            if (message.type === "room" && message.state && !disposed) setRoom(message);
          } catch { /* ignore malformed frames */ }
        };
        next.onclose = () => {
          window.clearInterval(pingTimer);
          if (disposed) return;
          setConnected(false);
          startPolling();
          attempts += 1;
          retryTimer = window.setTimeout(() => void connect(), Math.min(15_000, 1_000 * 2 ** Math.min(attempts, 4)));
        };
      } catch (caught) {
        if (disposed) return;
        if (caught instanceof ApiError && caught.status === 401) { setExpired(true); return; }
        setConnected(false);
        startPolling();
        attempts += 1;
        retryTimer = window.setTimeout(() => void connect(), Math.min(15_000, 1_000 * 2 ** Math.min(attempts, 4)));
      }
    };

    const onOnline = () => { window.clearTimeout(retryTimer); attempts = 0; void connect(); };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    void connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      stopPolling();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      socket?.close();
    };
  }, [code, token]);

  return { room, setRoom, connected, error, expired };
}
