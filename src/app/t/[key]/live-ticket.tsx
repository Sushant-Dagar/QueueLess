"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { leaveQueueAction } from "@/app/actions";
import { TokenSlip } from "@/components/token-slip";
import { useLiveQueue } from "@/components/use-live-queue";
import { formatToken } from "@/lib/queue";
import { t, type Lang } from "@/lib/i18n";
import type { TicketView } from "@/lib/tickets";

/** Short two-tone chime made with the Web Audio API, so there's no audio file to load. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.45);
    });
  } catch {
    // Audio can be blocked until the user has interacted with the page; the visual alert still shows.
  }
}

export function LiveTicket({ accessKey, initial, lang }: { accessKey: string; initial: TicketView; lang: Lang }) {
  const [view, setView] = useState(initial);
  const [leaving, startLeaving] = useTransition();
  const prevStatus = useRef(initial.status);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/tickets/${accessKey}`, { cache: "no-store" });
    if (res.ok) setView(await res.json());
  }, [accessKey]);
  const live = useLiveQueue(initial.business.slug, refresh);

  // Alert once when the customer is called: sound, vibration, and the tab title.
  useEffect(() => {
    if (view.status === "CALLED" && prevStatus.current !== "CALLED") {
      chime();
      navigator.vibrate?.([300, 150, 300]);
    }
    prevStatus.current = view.status;
    document.title =
      view.status === "CALLED" ? `🔔 ${formatToken(view.number)} — ${t(lang, "ticket.called")}` : `${formatToken(view.number)} · QueueLess`;
  }, [view.status, view.number, lang]);

  const token = formatToken(view.number);
  const done = view.status === "SERVED" || view.status === "CANCELLED" || view.status === "SKIPPED";

  let message: string;
  if (view.status === "CALLED") message = t(lang, "ticket.called");
  else if (view.status === "SERVED") message = t(lang, "ticket.served");
  else if (view.status === "SKIPPED") message = t(lang, "ticket.skipped");
  else if (view.status === "CANCELLED") message = t(lang, "ticket.cancelled");
  else if (view.peopleAhead === 0) message = t(lang, "ticket.aheadNone");
  else if (view.peopleAhead === 1) message = t(lang, "ticket.aheadOne");
  else message = t(lang, "ticket.ahead", { n: view.peopleAhead });

  return (
    <div className="mt-8 flex flex-col items-center">
      <p className="self-start text-lg font-medium">{view.business.name}</p>

      <div className="mt-4 w-full flex justify-center">
        <TokenSlip
          heading={`${t(lang, "ticket.yourToken")} · ${view.customerName}`}
          token={token}
          highlight={view.status === "CALLED"}
          footer={
            done ? null : (
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block size-2 shrink-0 rounded-full ${live === "live" ? "bg-go" : "bg-amber"}`}
                  aria-hidden="true"
                />
                {live === "live" ? t(lang, "ticket.live") : t(lang, "ticket.reconnecting")} — {t(lang, "ticket.keepOpen")}
              </span>
            )
          }
        >
          <div role="status" aria-live="assertive" className="mt-5 border-t border-rule pt-4">
            <p className={`text-xl font-semibold ${view.status === "CALLED" ? "text-go" : view.status === "SKIPPED" ? "text-stop" : ""}`}>
              {message}
            </p>
            {view.status === "WAITING" && view.peopleAhead > 0 && (
              <p className="mt-1 text-ink-soft">{t(lang, "ticket.eta", { m: view.etaMinutes })}</p>
            )}
            {view.status === "WAITING" && (
              <p className="mt-3 text-sm text-ink-soft">
                {t(lang, "join.nowServing")}:{" "}
                <span className="token-num text-xl font-bold text-amber-deep">
                  {view.nowServing.length ? view.nowServing.map(formatToken).join(", ") : "—"}
                </span>
              </p>
            )}
          </div>
        </TokenSlip>
      </div>

      {view.status === "WAITING" && (
        <button
          type="button"
          disabled={leaving}
          onClick={() => {
            if (!confirm(t(lang, "ticket.leaveConfirm"))) return;
            startLeaving(async () => {
              await leaveQueueAction(accessKey);
              await refresh();
            });
          }}
          className="mt-10 text-sm font-medium text-stop underline underline-offset-4 disabled:opacity-60"
        >
          {t(lang, "ticket.leave")}
        </button>
      )}
    </div>
  );
}
