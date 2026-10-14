"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/app/actions";

const input =
  "mt-1.5 block w-full rounded-lg border border-rule bg-slip px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";
const label = "block text-sm font-medium";

function ErrorNote({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-stop/30 bg-stop/5 px-3.5 py-2.5 text-sm text-stop">
      {state.error}
    </p>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-5">
      <ErrorNote state={state} />
      <div>
        <label className={label} htmlFor="businessName">Business name</label>
        <input className={input} id="businessName" name="businessName" required maxLength={60} defaultValue={f.businessName} placeholder="Sharma Clinic, Sector 15" />
      </div>
      <div>
        <label className={label} htmlFor="category">Type of business</label>
        <select className={input} id="category" name="category" defaultValue={f.category ?? "Clinic"}>
          {["Clinic", "Salon", "Bank / Office", "Restaurant", "Other"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="name">Your name</label>
        <input className={input} id="name" name="name" required autoComplete="name" defaultValue={f.name} />
      </div>
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input className={input} id="email" name="email" type="email" required autoComplete="email" defaultValue={f.email} />
      </div>
      <div>
        <label className={label} htmlFor="password">Password</label>
        <input className={input} id="password" name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="pw-hint" />
        <p id="pw-hint" className="mt-1 text-sm text-ink-soft">At least 8 characters.</p>
      </div>
      <button disabled={pending} className="w-full rounded-xl bg-ink py-3 font-semibold text-paper hover:bg-ink/90 disabled:opacity-60">
        {pending ? "Creating your queue…" : "Create my queue"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account? <Link href="/login" className="font-medium text-ink underline underline-offset-4">Log in</Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5">
      <ErrorNote state={state} />
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input className={input} id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} />
      </div>
      <div>
        <label className={label} htmlFor="password">Password</label>
        <input className={input} id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <button disabled={pending} className="w-full rounded-xl bg-ink py-3 font-semibold text-paper hover:bg-ink/90 disabled:opacity-60">
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        New here? <Link href="/signup" className="font-medium text-ink underline underline-offset-4">Set up your queue</Link>
      </p>
    </form>
  );
}
