"use client";

import { useEffect, useRef, useState } from "react";

export type LiveStatus = "connecting" | "live" | "reconnecting";

/**
 * Keeps a view in sync with a queue. Opens one Server-Sent Events stream per page and calls
 * `refresh` whenever the queue changes, when the stream (re)connects (to catch anything missed
 * while offline), and when the tab becomes visible again (phones suspend background tabs).
 */
export function useLiveQueue(slug: string, refresh: () => void | Promise<void>): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const es = new EventSource(`/api/queues/${encodeURIComponent(slug)}/events`);
    const run = () => void refreshRef.current();
    es.addEventListener("ready", () => {
      setStatus("live");
      run();
    });
    es.addEventListener("change", run);
    es.onerror = () => setStatus("reconnecting"); // EventSource retries on its own.

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      es.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug]);

  return status;
}
