import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { getPublicQueueInfo } from "@/lib/tickets";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { Brand } from "@/components/brand";
import { LangSwitch } from "@/components/lang-switch";
import { JoinPanel } from "./join-panel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const info = await getPublicQueueInfo(db, (await params).slug);
  return { title: info ? `Join the queue at ${info.business.name}` : "Queue not found" };
}

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [info, lang] = await Promise.all([getPublicQueueInfo(db, slug), getLang()]);
  if (!info) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Brand />
        <LangSwitch lang={lang} label={t(lang, "lang.switch")} />
      </div>
      <JoinPanel initial={info} lang={lang} />
    </main>
  );
}
