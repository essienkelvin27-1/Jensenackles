import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions";
import { Notice } from "@/app/components";

export const metadata: Metadata = { title: "Create an account" };

export default async function Register({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Your next night out</span>
        <h1>Let’s get you in.</h1>
        <p>Create an account to book events, manage payments, and keep your digital tickets close.</p>
        <Notice error={params.error} />
        <form className="form-stack" action={registerAction}>
          <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" autoComplete="name" minLength={2} maxLength={100} required /></div>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><span className="field-hint">Use at least 8 characters.</span></div>
          <button className="button button-dark" type="submit">Create account <span aria-hidden="true">↗</span></button>
        </form>
        <div className="auth-links"><span>Already have an account?</span><Link href="/login">Sign in</Link></div>
      </div>
    </section>
  );
}
