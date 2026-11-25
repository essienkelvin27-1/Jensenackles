import type { Metadata } from "next";
import Link from "next/link";
import { createSupportTicketAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Customer support" };
export const dynamic = "force-dynamic";

export default async function Support({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const { data: tickets, error } = await supabase.from("support_tickets")
    .select("id,subject,status,created_at,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="page-shell">
      <PageHeading eyebrow="We’re here to help" title="Customer support." description="Send our team a message or follow up on one of your existing requests." />
      <Notice error={params.error} />
      {error && <p className="notice notice-error">Support requests could not be loaded. Please try again.</p>}
      <div className="split-layout">
        <section className="panel">
          <h2>Start a conversation</h2>
          <form action={createSupportTicketAction} className="form-stack">
            <div className="field"><label htmlFor="subject">Subject</label><input id="subject" name="subject" minLength={3} maxLength={150} required /></div>
            <div className="field"><label htmlFor="message">How can we help?</label><textarea id="message" name="message" minLength={10} maxLength={4000} required /></div>
            <button className="button button-dark" type="submit">Send to support</button>
          </form>
        </section>
        <section className="panel">
          <h2>Your support requests</h2>
          {!error && (!tickets || tickets.length === 0) && <p className="muted text-small">You haven’t contacted us yet.</p>}
          {tickets?.map((ticket) => (
            <Link className="list-row support-row" href={`/support/${ticket.id}`} key={ticket.id}>
              <div><h3>{ticket.subject}</h3><p>Updated {new Date(ticket.updated_at).toLocaleDateString()}</p></div>
              <span className={`status status-${ticket.status}`}>{ticket.status}</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
