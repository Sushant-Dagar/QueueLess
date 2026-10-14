import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Set up your queue" };

export default function SignupPage() {
  return (
    <AuthShell title="Set up your queue" lead="It takes a minute. You'll get a QR code to print right away.">
      <SignupForm />
    </AuthShell>
  );
}
