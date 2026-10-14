"use client";

import { useActionState, useCallback, useState } from "react";
import { joinQueueAction } from "@/app/actions";
import { useLiveQueue } from "@/components/use-live-queue";
import { formatToken } from "@/lib/queue";
import { t, type Lang } from "@/lib/i18n";
import type { PublicQueueInfo } from "@/lib/tickets";

const input =
  "mt-1.5 block w-full rounded-lg border border-rule bg-slip px-3.5 py-3 text-lg text-ink focus:border-ink focus:outline-none";

export function JoinPanel({ initial, lang }: { initial: PublicQueueInfo; lang: Lang }) {
  const [info, setInfo] = useState(initial);
  const slug = initial.business.slug;
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/queues/${slug}`, { cache: "no-store" });
    if (res.ok) setInfo(await res.json());
  }, [slug]);
  useLiveQueue(slug, refresh);

  const [state, action, pending] = useActionState(joinQueueAction.bind(null, slug), undefined);

  return (
    <div className="mt-10">
      <p className="text-ink-soft">{info.business.category}</p>
      <h1 className="text-3xl leading-tight font-semibold tracking-tight">{info.business.name}</h1>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule bg-rule" aria-live="polite">
        <div className="bg-slip p-4">
          <dt className="text-sm text-ink-soft">{t(lang, "join.nowServing")}</dt>
          <dd className="token-num mt-1 text-4xl font-bold text-amber-deep">
            {info.nowServing.length ? info.nowServing.map(formatToken).join(", ") : <span className="font-sans text-lg font-medium text-ink-soft">{t(lang, "join.nobodyServing")}</span>}
          </dd>
        </div>
        <div className="bg-slip p-4">
          <dt className="text-sm text-ink-soft">{t(lang, "join.waiting", { n: info.waitingCount })}</dt>
          <dd className="mt-1 text-lg font-medium">
            {info.waitingCount === 0 ? t(lang, "join.etaNone") : t(lang, "join.eta", { m: info.etaMinutes })}
          </dd>
        </div>
      </dl>

      {info.business.isOpen ? (
        <form action={action} className="mt-8 space-y-5">
          <h2 className="text-xl font-semibold">{t(lang, "join.title")}</h2>
          {state?.error && (
            <p role="alert" className="rounded-lg border border-stop/30 bg-stop/5 px-3.5 py-2.5 text-sm text-stop">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium">{t(lang, "join.name")}</label>
            <input id="customerName" name="customerName" required maxLength={40} autoComplete="given-name" className={input} defaultValue={state?.fields?.customerName} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium">{t(lang, "join.phone")}</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" className={input} aria-describedby="phone-hint" defaultValue={state?.fields?.phone} />
            <p id="phone-hint" className="mt-1 text-sm text-ink-soft">{t(lang, "join.phoneHint")}</p>
          </div>
          <button disabled={pending} className="w-full rounded-xl bg-ink py-4 text-lg font-semibold text-paper hover:bg-ink/90 disabled:opacity-60">
            {t(lang, "join.submit")}
          </button>
        </form>
      ) : (
        <p role="status" className="mt-8 rounded-xl border border-rule bg-slip p-5 text-ink-soft">
          {t(lang, "join.closed")}
        </p>
      )}
    </div>
  );
}
