import { Brand } from "./brand";

export function AuthShell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Brand />
      <div className="mt-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-ink-soft">{lead}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
