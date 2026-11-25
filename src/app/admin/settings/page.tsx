import type { Metadata } from "next";
import { PageHeading } from "@/app/components";

export const metadata: Metadata = { title: "Deployment settings" };

export default function AdminSettings() {
  const configured = (name: string) => Boolean(process.env[name]);
  const settings = [
    ["Supabase project URL", configured("NEXT_PUBLIC_SUPABASE_URL"), "NEXT_PUBLIC_SUPABASE_URL"],
    ["Supabase public key", configured("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    ["SMTP host", configured("SMTP_HOST"), "SMTP_HOST"],
    ["SMTP port", configured("SMTP_PORT"), "SMTP_PORT"],
    ["SMTP username (server only)", configured("SMTP_USER"), "SMTP_USER"],
    ["SMTP password (server only)", configured("SMTP_PASSWORD"), "SMTP_PASSWORD"],
    ["Email sender", configured("EMAIL_FROM"), "EMAIL_FROM"],
    ["Canonical site URL", configured("NEXT_PUBLIC_SITE_URL"), "NEXT_PUBLIC_SITE_URL"],
    ["Bank transfer instructions", configured("NEXT_PUBLIC_BANK_TRANSFER_INSTRUCTIONS"), "NEXT_PUBLIC_BANK_TRANSFER_INSTRUCTIONS"],
  ] as const;
  return (
    <>
      <PageHeading eyebrow="Deployment" title="Settings & connections." description="This page reports whether required environment variables are present. Secret values are never displayed." />
      <section className="panel">
        <h2>Connected services</h2>
        <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>Setting</th><th>Environment variable</th><th>Status</th></tr></thead>
          <tbody>{settings.map(([label, isConfigured, variable]) => (
            <tr key={variable}><td>{label}</td><td><code>{variable}</code></td><td><span className={`status ${isConfigured ? "status-paid" : "status-rejected"}`}>{isConfigured ? "Configured" : "Missing"}</span></td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <section className="panel">
        <h2>Supabase setup</h2>
        <ol className="setup-list">
          <li>Apply <code>supabase/migrations/202611240001_initial_schema.sql</code> to your Supabase project.</li>
          <li>In Supabase Authentication settings, enable email confirmations, configure the site URL and redirect URL <code>/auth/callback</code>, and enter your Gmail SMTP credentials for Auth emails.</li>
          <li>Set <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASSWORD</code>, and <code>EMAIL_FROM</code> in your server environment for application notifications.</li>
          <li>Set public bank deposit instructions in <code>NEXT_PUBLIC_BANK_TRANSFER_INSTRUCTIONS</code>; customers see them at checkout.</li>
          <li>Promote the first administrator directly in the Supabase SQL editor: <code>update public.profiles set role = &apos;admin&apos; where email = &apos;you@example.com&apos;;</code></li>
          <li>Keep all email credentials server-only. The application does not need or use a Supabase service-role key.</li>
        </ol>
      </section>
      <section className="panel">
        <h2>Payment verification</h2>
        <p className="muted text-small">Customers submit bank-transfer references or private gift-card evidence; TourTickets does not collect card payments or connect to a bank automatically. Administrators must independently verify each transfer or card before approving an order.</p>
      </section>
    </>
  );
}
