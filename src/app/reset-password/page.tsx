import type { Metadata } from "next";
import { resetPasswordAction } from "@/app/actions";
import { Notice } from "@/app/components";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPassword({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Account recovery</span>
        <h1>Choose a new password.</h1>
        <p>Use at least 8 characters for your new password.</p>
        <Notice error={params.error} />
        <form className="form-stack" action={resetPasswordAction}>
          <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
          <button className="button button-dark" type="submit">Update password</button>
        </form>
      </div>
    </section>
  );
}
