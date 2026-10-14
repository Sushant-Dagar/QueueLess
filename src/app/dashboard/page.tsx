import type { Metadata } from "next";
import { db } from "@/db";
import { requireUser } from "@/lib/dal";
import { getQueueSnapshot } from "@/lib/tickets";
import { Brand } from "@/components/brand";
import { logout } from "@/app/actions";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const snapshot = await getQueueSnapshot(db, user.businessId);
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <Brand href="/dashboard" />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-soft">{user.name}</span>
          <form action={logout}>
            <button className="font-medium underline underline-offset-4">Log out</button>
          </form>
        </div>
      </header>
      <Dashboard initial={snapshot} />
    </div>
  );
}
