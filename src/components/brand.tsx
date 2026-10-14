import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold text-ink" aria-label="QueueLess home">
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#17323a" />
        <path d="M14 22h36v8a4 4 0 0 0 0 8v8H14v-8a4 4 0 0 0 0-8z" fill="#f0a202" />
      </svg>
      <span className="text-lg tracking-tight">QueueLess</span>
    </Link>
  );
}
