import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { replySupportAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Support conversation" };
export const dynamic = "force-dynamic";

export default async function SupportConversation({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireUser();
  const [{ data: ticket, error }, { data: messages }] = await Promise.all([
    supabase.from("support_tickets").select("id,subject,status,created_at").eq("id", id).single(),
    supabase.from("support_messages").select("id,sender_id,message,created_at").eq("support_ticket_id", id).order("created_at"),
  ]);
  if (error || !ticket) notFound();

  return (
    <div className="page-shell">
      <Link className="back-link" href="/support">← All support requests</Link>
      <PageHeading eyebrow={`Request ${ticket.id.slice(0, 8).toUpperCase()}`} title={ticket.subject} description={`Status: ${ticket.status}`} />
      <Notice error={query.error} message={query.message} />
      <div className="split-layout">
        <section className="panel">
          <h2>Conversation</h2>
          {messages?.map((message) => (
            <article className={`support-message ${message.sender_id !== user.id ? "admin-message" : ""}`} key={message.id}>
              <small>{message.sender_id === user.id ? "You" : "TourTickets support"} · {new Date(message.created_at).toLocaleString()}</small>
              <p>{message.message}</p>
            </article>
          ))}
          {(!messages || messages.length === 0) && <p className="muted text-small">No messages in this request.</p>}
        </section>
        {ticket.status !== "closed" && (
          <section className="panel">
            <h2>Reply</h2>
            <form action={replySupportAction} className="form-stack">
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <div className="field"><label htmlFor="message">Message</label><textarea id="message" name="message" maxLength={4000} required /></div>
              <button className="button button-dark" type="submit">Send reply</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
