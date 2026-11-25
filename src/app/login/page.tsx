import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { Notice } from "@/app/components";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Good to see you.</h1>
        <p>Sign in to find your tickets and get back to the good part.</p>
        <Notice error={params.error} message={params.message} />
        <form className="form-stack" action={loginAction}>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          <button className="button button-dark" type="submit">Sign in <span aria-hidden="true">↗</span></button>
        </form>
        <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/register">Create account</Link></div>
      </div>
    </section>
  );
}
