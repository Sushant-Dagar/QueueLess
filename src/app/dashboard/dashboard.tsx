"use client";

import { useCallback, useState, useTransition } from "react";
import { callNextAction, setTicketStatusAction, toggleOpenAction } from "@/app/actions";
import { useLiveQueue } from "@/components/use-live-queue";
import { formatToken } from "@/lib/queue";
import type { QueueSnapshot } from "@/lib/tickets";
import type { TicketStatus } from "@/db/schema";

function minutesSince(iso: string | Date | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

export function Dashboard({ initial }: { initial: QueueSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/dashboard/queue", { cache: "no-store" });
    if (res.ok) setSnap(await res.json());
  }, []);
  const live = useLiveQueue(initial.business.slug, refresh);

  const run = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (result && result.error) setError(result.error);
      await refresh();
    });
  const move = (id: string, to: TicketStatus) => run(() => setTicketStatusAction(id, to));

  const serving = snap.nowServing[0];
  const { business } = snap;
  const joinUrl = typeof window === "undefined" ? `/q/${business.slug}` : `${window.location.origin}/q/${business.slug}`;

  return (
    <main className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p className="text-ink-soft">{business.category}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{business.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-ink-soft" aria-live="polite">
            <span className={`size-2 rounded-full ${live === "live" ? "bg-go" : "bg-amber"}`} aria-hidden="true" />
            {live === "live" ? "Live" : "Reconnecting…"}
          </span>
          <button
            type="button"
            onClick={() => run(() => toggleOpenAction(!business.isOpen))}
            disabled={pending}
            aria-pressed={business.isOpen}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${business.isOpen ? "border-go bg-go/10 text-go" : "border-stop bg-stop/5 text-stop"}`}
          >
            {business.isOpen ? "Open for new tokens" : "Closed to new tokens"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-stop/30 bg-stop/5 px-4 py-2.5 text-sm text-stop">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Counter: the one big action */}
        <section aria-labelledby="counter" className="rounded-3xl bg-board p-7 text-paper">
          <h2 id="counter" className="text-sm font-medium text-paper/70">At the counter</h2>
          {serving ? (
            <>
              <p key={serving.id} className="token-num token-arrive mt-2 text-[7rem] font-extrabold text-amber">
                {formatToken(serving.number)}
              </p>
              <p className="text-lg">
                {serving.customerName}
                <span className="text-paper/60"> · called {minutesSince(serving.calledAt)} min ago</span>
              </p>
              <div className="mt-4 flex gap-3 text-sm">
                <button onClick={() => move(serving.id, "SKIPPED")} disabled={pending} className="rounded-lg border border-paper/30 px-3 py-1.5 hover:border-paper">
                  Didn&apos;t show up
                </button>
                <button onClick={() => move(serving.id, "WAITING")} disabled={pending} className="rounded-lg border border-paper/30 px-3 py-1.5 hover:border-paper">
                  Send to back of line
                </button>
              </div>
            </>
          ) : (
            <p className="token-num mt-2 text-[7rem] font-extrabold text-paper/20" aria-label="Nobody at the counter">
              ---
            </p>
          )}
          <button
            onClick={() => run(() => callNextAction())}
            disabled={pending || (snap.waiting.length === 0 && !serving)}
            className="mt-8 w-full rounded-2xl bg-amber py-5 text-xl font-bold text-board hover:brightness-105 disabled:opacity-40"
          >
            {serving ? (snap.waiting.length ? "Done — call next" : "Done — counter free") : "Call next"}
          </button>
          <p className="mt-3 text-center text-sm text-paper/60">
            {serving ? `Marks ${formatToken(serving.number)} as served, then calls the next token.` : "Calls the longest-waiting token."}
          </p>
        </section>

        <div>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-rule bg-rule">
            {[
              ["Waiting", snap.waiting.length],
              ["Served today", snap.servedToday],
              ["Avg. service", `${snap.avgMinutes} min`],
            ].map(([k, v]) => (
              <div key={k} className="bg-slip p-4">
                <dt className="text-sm text-ink-soft">{k}</dt>
                <dd className="token-num mt-1 text-3xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="line" className="mt-8">
            <h2 id="line" className="text-xl font-semibold">In line</h2>
            {snap.waiting.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-rule p-6 text-ink-soft">
                Nobody is waiting. Customers who scan your QR code will appear here instantly.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-slip">
                {snap.waiting.map((w) => (
                  <li key={w.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="token-num w-20 text-2xl font-bold">{formatToken(w.number)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{w.customerName}</span>
                      <span className="text-sm text-ink-soft">
                        waiting {minutesSince(w.createdAt)} min{w.phone ? ` · ${w.phone}` : ""}
                      </span>
                    </span>
                    <button onClick={() => move(w.id, "SKIPPED")} disabled={pending} className="text-sm text-ink-soft underline underline-offset-4 hover:text-stop">
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {snap.skipped.length > 0 && (
            <section aria-labelledby="missed" className="mt-8">
              <h2 id="missed" className="text-lg font-semibold">Missed their turn</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {snap.skipped.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => move(s.id, "WAITING")} disabled={pending} className="rounded-full border border-rule bg-slip px-3 py-1 text-sm hover:border-ink" title="Put back in line">
                      <span className="token-num font-bold">{formatToken(s.number)}</span> {s.customerName} · put back in line
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="share" className="mt-10 flex flex-wrap items-center gap-6 border-t border-rule pt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/queues/${business.slug}/qr`} alt={`QR code that opens ${joinUrl}`} width={132} height={132} className="rounded-lg border border-rule bg-white p-1" />
            <div className="min-w-0 flex-1">
              <h2 id="share" className="text-lg font-semibold">Your QR code</h2>
              <p className="mt-1 break-all text-sm text-ink-soft">{joinUrl}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium">
                <a href={`/api/queues/${business.slug}/qr`} download={`${business.slug}-qr.svg`} className="underline underline-offset-4">Download to print</a>
                <a href={`/display/${business.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">Open TV display</a>
                <a href={`/q/${business.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">Open join page</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
