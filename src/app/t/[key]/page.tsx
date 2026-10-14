import type { Metadata } from "next";
import { db } from "@/db";
import { getTicketView } from "@/lib/tickets";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { formatToken } from "@/lib/queue";
import { Brand } from "@/components/brand";
import { LangSwitch } from "@/components/lang-switch";
import { LiveTicket } from "./live-ticket";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const view = await getTicketView(db, (await params).key);
  return {
    title: view ? `Token ${formatToken(view.number)} at ${view.business.name}` : "Ticket",
    robots: { index: false, follow: false },
  };
}

export default async function TicketPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [view, lang] = await Promise.all([getTicketView(db, key), getLang()]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Brand />
        <LangSwitch lang={lang} label={t(lang, "lang.switch")} />
      </div>
      {view ? (
        <LiveTicket accessKey={key} initial={view} lang={lang} />
      ) : (
        <p className="mt-16 text-lg">{t(lang, "ticket.notFound")}</p>
      )}
    </main>
  );
}
