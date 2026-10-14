"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLangAction } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLangAction(next);
          router.refresh();
        })
      }
      className="rounded-full border border-rule bg-slip px-3.5 py-1 text-sm font-medium text-ink hover:border-ink disabled:opacity-60"
    >
      {label}
    </button>
  );
}
