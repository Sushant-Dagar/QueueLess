import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Staff login" };

export default function LoginPage() {
  return (
    <AuthShell title="Staff login" lead="Run your queue from the counter.">
      <LoginForm />
    </AuthShell>
  );
}
