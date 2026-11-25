import type { Metadata } from "next";
import { replySupportAction, updateSupportStatusAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Customer support management" };

type SupportMessage = { id: string; sender_id: string; message: string; created_at: string };
type SupportTicket = {
  id: string;
  customer_id: string;
  subject: string;
  status: string;
  updated_at: string;
  profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  support_messages: SupportMessage[];
};

export default async function AdminSupport({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("support_tickets")
    .select("id,customer_id,subject,status,updated_at,profiles(full_name,email),support_messages(id,sender_id,message,created_at)")
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "support_messages", ascending: true })
    .limit(100);
  const tickets = (data ?? []) as unknown as SupportTicket[];

  return (
    <>
      <PageHeading eyebrow="Customer care" title="Support conversations." description="Reply to customer requests and keep each conversation’s status up to date." />
      <Notice error={params.error} message={params.message} />
      {error && <p className="notice notice-error">Support inbox could not be loaded.</p>}
      {!error && tickets.length === 0 && <div className="empty-state"><span className="empty-icon">✳</span><h3>Inbox is clear.</h3><p>Customer support requests will show up here.</p></div>}
      <div className="admin-order-list">
        {tickets.map((ticket) => {
          const customer = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles;
          return (
            <section className="panel admin-order" key={ticket.id}>
              <div className="order-topline">
                <div><span className="eyebrow">{customer?.full_name || "Customer"} · {customer?.email ?? "Email unavailable"}</span><h2>{ticket.subject}</h2><p>Updated {new Date(ticket.updated_at).toLocaleString()}</p></div>
                <span className={`status status-${ticket.status}`}>{ticket.status}</span>
              </div>
              <div className="admin-conversation">
                {ticket.support_messages.map((message) => (
                  <article className={`support-message ${message.sender_id !== ticket.customer_id ? "admin-message" : ""}`} key={message.id}>
                    <small>{message.sender_id === ticket.customer_id ? "Customer" : "Support"} · {new Date(message.created_at).toLocaleString()}</small>
                    <p>{message.message}</p>
                  </article>
                ))}
              </div>
              {ticket.status !== "closed" && (
                <form action={replySupportAction} className="form-stack">
                  <input type="hidden" name="ticket_id" value={ticket.id} />
                  <div className="field"><label htmlFor={`reply-${ticket.id}`}>Reply to customer</label><textarea id={`reply-${ticket.id}`} name="message" maxLength={4000} required /></div>
                  <button className="button button-dark button-small" type="submit">Send reply & notify customer</button>
                </form>
              )}
              <form action={updateSupportStatusAction} className="inline-form status-form">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <select name="status" defaultValue={ticket.status} aria-label={`Set status for ${ticket.subject}`}>
                  <option value="open">Open</option><option value="answered">Answered</option><option value="closed">Closed</option>
                </select>
                <button className="button button-outline button-small" type="submit">Update status</button>
              </form>
            </section>
          );
        })}
      </div>
    </>
  );
}
