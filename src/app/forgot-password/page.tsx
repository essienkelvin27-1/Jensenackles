import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions";
import { Notice } from "@/app/components";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPassword({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Account recovery</span>
        <h1>Let’s get you back in.</h1>
        <p>Enter your account email and we’ll send you a secure password reset link.</p>
        <Notice error={params.error} message={params.message} />
        <form className="form-stack" action={forgotPasswordAction}>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
          <button className="button button-dark" type="submit">Send reset link</button>
        </form>
        <div className="auth-links"><Link href="/login">Back to sign in</Link></div>
      </div>
    </section>
  );
}
