import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { getPublicQueueInfo } from "@/lib/tickets";
import { Board } from "./board";

export const metadata: Metadata = { title: "Now serving", robots: { index: false } };

export default async function DisplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const info = await getPublicQueueInfo(db, (await params).slug);
  if (!info) notFound();
  return <Board initial={info} />;
}
