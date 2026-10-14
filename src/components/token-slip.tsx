import type { ReactNode } from "react";

/**
 * The signature element: a paper token slip with a perforated tear-off edge,
 * echoing the printed tokens handed out at Indian clinic and bank counters.
 */
export function TokenSlip({
  heading,
  token,
  highlight = false,
  children,
  footer,
}: {
  heading: string;
  token: string;
  highlight?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm drop-shadow-[0_18px_30px_rgba(23,50,58,0.14)]">
      <div className="rounded-t-2xl bg-slip px-7 pt-6 pb-5">
        <p className="text-sm font-medium text-ink-soft">{heading}</p>
        <p
          key={token + String(highlight)}
          className={`token-num mt-1 text-[5.5rem] font-extrabold ${highlight ? "token-arrive text-go" : "text-ink"}`}
        >
          {token}
        </p>
        {children}
      </div>
      <div className="slip-perf bg-slip" aria-hidden="true" />
      <div className="rounded-b-2xl bg-slip px-7 pt-3 pb-5 text-sm text-ink-soft">{footer}</div>
    </div>
  );
}
