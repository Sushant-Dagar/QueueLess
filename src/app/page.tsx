import Link from "next/link";
import { Brand } from "@/components/brand";
import { LangSwitch } from "@/components/lang-switch";
import { TokenSlip } from "@/components/token-slip";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function Home() {
  const lang = await getLang();
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Brand />
        <nav className="flex items-center gap-3">
          <LangSwitch lang={lang} label={t(lang, "lang.switch")} />
          <Link href="/login" className="text-sm font-medium text-ink underline-offset-4 hover:underline">
            {t(lang, "app.cta.login")}
          </Link>
        </nav>
      </header>

      <main>
        <section className="grid items-center gap-12 py-10 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <h1 className="max-w-[16ch] text-[2.6rem] leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              {t(lang, "app.tagline")}
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg text-ink-soft">{t(lang, "app.lead")}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-ink px-6 py-3.5 font-semibold text-paper hover:bg-ink/90"
              >
                {t(lang, "app.cta.start")}
              </Link>
              <Link href="/q/demo-clinic" className="font-medium text-ink underline underline-offset-4">
                {lang === "hi" ? "डेमो कतार देखें" : "Try the demo queue"}
              </Link>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <TokenSlip
              heading={lang === "hi" ? "आपका टोकन · शर्मा क्लिनिक" : "Your token at Sharma Clinic"}
              token="A-014"
              footer={lang === "hi" ? "यह पेज अपने-आप अपडेट होता है।" : "This page updates by itself."}
            >
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-rule pt-4">
                <div>
                  <dt className="text-sm text-ink-soft">{lang === "hi" ? "आपसे पहले" : "Ahead of you"}</dt>
                  <dd className="token-num text-4xl font-bold">3</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-soft">{lang === "hi" ? "अनुमानित इंतज़ार" : "Estimated wait"}</dt>
                  <dd className="token-num text-4xl font-bold">
                    12<span className="ml-1 font-sans text-base font-medium">min</span>
                  </dd>
                </div>
              </dl>
            </TokenSlip>
          </div>
        </section>

        <section aria-labelledby="how" className="border-t border-rule py-14">
          <h2 id="how" className="text-2xl font-semibold">
            {lang === "hi" ? "यह कैसे काम करता है" : "How it works"}
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              [t(lang, "step.qr.title"), t(lang, "step.qr.body")],
              [t(lang, "step.join.title"), t(lang, "step.join.body")],
              [t(lang, "step.call.title"), t(lang, "step.call.body")],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="token-num text-5xl font-extrabold text-amber" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-rule py-8 text-sm text-ink-soft">
        Built by Sushant Dagar ·{" "}
        <a className="underline underline-offset-4" href="https://github.com/Sushant-Dagar/queueless">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
