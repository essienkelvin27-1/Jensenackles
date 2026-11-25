import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, PageHeading } from "@/app/components";
import { requireUser } from "@/lib/auth";
import PaymentForm from "./payment-form";

export const metadata: Metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

type Order = {
  id: string;
  status: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
  expires_at: string;
  events: { name: string; venue: string; starts_at: string } | { name: string; venue: string; starts_at: string }[] | null;
};

export default async function OrderDetails({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("orders")
    .select("id,status,quantity,unit_price_cents,total_cents,created_at,expires_at,events(name,venue,starts_at)")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  const order = data as Order;
  const event = Array.isArray(order.events) ? order.events[0] : order.events;
  const { data: tickets, error: ticketsError } = await supabase.from("tickets").select("id").eq("order_id", order.id);
  const { data: payments } = await supabase.from("payment_submissions")
    .select("admin_note,status,submitted_at")
    .eq("order_id", order.id)
    .order("submitted_at", { ascending: false })
    .limit(1);
  const reservationExpired = order.status === "pending" && new Date(order.expires_at) <= new Date();
  const money = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(cents / 100);

  return (
    <div className="page-shell">
      <Link className="back-link" href="/account">← Back to your account</Link>
      <PageHeading eyebrow={`Order ${order.id.slice(0, 8).toUpperCase()}`} title={event?.name ?? "Your order"} description={event ? `${event.venue} · ${new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(event.starts_at))}` : undefined} />
      <Notice error={query.error} message={query.message} />
      <div className="split-layout">
        <section className="panel">
          <h2>Order summary</h2>
          <div className="list-row"><div><h3>{order.quantity} ticket{order.quantity === 1 ? "" : "s"}</h3><p>{money(order.unit_price_cents)} each</p></div><strong>{money(order.total_cents)}</strong></div>
          <div className="list-row"><div><h3>Payment status</h3><p>Order placed {new Date(order.created_at).toLocaleDateString()}</p></div><span className={`status status-${order.status}`}>{order.status.replace("_", " ")}</span></div>
          {order.status === "paid" && <div className="ticket-actions"><Link className="button button-dark button-small" href="/tickets">Open your digital tickets ↗</Link></div>}
          {order.status === "under_review" && <p className="notice notice-success">Your payment was submitted and is waiting for administrator verification. We’ll email you when it’s reviewed.</p>}
          {order.status === "rejected" && <p className="notice notice-error">Your last payment was not approved. {payments?.[0]?.admin_note ?? "Review your payment details and submit again, or contact support."}</p>}
        </section>
        {reservationExpired && (
          <section className="panel">
            <h2>Checkout reservation expired</h2>
            <p className="muted text-small">This unpaid ticket reservation expired after 30 minutes. Create a new order to check current availability.</p>
            <Link className="button button-dark button-small" href="/#events">Choose tickets again ↗</Link>
          </section>
        )}
        {((order.status === "pending" && !reservationExpired) || order.status === "rejected") && (
          <section className="panel">
            <h2>Complete your payment</h2>
            <p className="muted text-small">Choose a bank transfer or submit one or more gift cards. Your payment details are only shared with TourTickets administrators.</p>
            <PaymentForm
              orderId={order.id}
              totalCents={order.total_cents}
              bankInstructions={process.env.NEXT_PUBLIC_BANK_TRANSFER_INSTRUCTIONS ?? ""}
            />
          </section>
        )}
        {order.status === "paid" && <section className="panel"><h2>Your tickets are ready</h2>{ticketsError ? <p className="notice notice-error">Ticket count could not be loaded. Open the ticket page to retry.</p> : <p className="muted text-small">{tickets?.length ?? 0} digital ticket(s) have been issued for this order.</p>}<Link className="button button-dark button-small" href="/tickets">View tickets ↗</Link></section>}
      </div>
    </div>
  );
}
