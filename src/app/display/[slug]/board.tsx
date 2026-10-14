"use client";

import { useCallback, useState } from "react";
import { useLiveQueue } from "@/components/use-live-queue";
import { formatToken } from "@/lib/queue";
import type { PublicQueueInfo } from "@/lib/tickets";

/** Full-screen "Now serving" board for a TV in the waiting area, like an LED token display. */
export function Board({ initial }: { initial: PublicQueueInfo }) {
  const [info, setInfo] = useState(initial);
  const slug = initial.business.slug;
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/queues/${slug}`, { cache: "no-store" });
    if (res.ok) setInfo(await res.json());
  }, [slug]);
  useLiveQueue(slug, refresh);
  const current = info.nowServing[0];

  return (
    <main className="flex min-h-dvh flex-col bg-board px-[5vw] py-[4vh] text-paper">
      <h1 className="text-[clamp(1.5rem,3vw,3rem)] font-semibold">{info.business.name}</h1>
      <div className="flex flex-1 flex-col items-center justify-center" aria-live="assertive">
        <p className="text-[clamp(1.25rem,2.6vw,2.5rem)] text-paper/70">Now serving · अभी बारी</p>
        <p key={current ?? "none"} className="token-num token-arrive text-[clamp(8rem,26vw,24rem)] font-extrabold text-amber drop-shadow-[0_0_40px_rgba(240,162,2,0.35)]">
          {current ? formatToken(current) : "---"}
        </p>
      </div>
      <p className="text-[clamp(1.1rem,2.2vw,2rem)] text-paper/70">
        {info.waitingCount} waiting · scan the QR code at the door to join
      </p>
    </main>
  );
}
