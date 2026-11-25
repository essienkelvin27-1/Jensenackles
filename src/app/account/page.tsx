import type { Metadata } from "next";
import Link from "next/link";
import { updateProfileAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

type Order = {
  id: string;
  status: string;
  quantity: number;
  total_cents: number;
  created_at: string;
  events: { name: string; starts_at: string } | { name: string; starts_at: string }[] | null;
};

export default async function Account({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: profile, error: profileError }, { data: orders, error: ordersError }, { count: ticketCount, error: ticketsError }] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,role").eq("id", user.id).single(),
    supabase.from("orders").select("id,status,quantity,total_cents,created_at,events(name,starts_at)").order("created_at", { ascending: false }).limit(50),
    supabase.from("tickets").select("id", { count: "exact", head: true }),
  ]);
  const money = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(cents / 100);

  return (
    <div className="page-shell">
      <PageHeading eyebrow="Your TourTickets" title={`Hey, ${profile?.full_name?.split(" ")[0] || "there"}.`} description="Your plans, payments, and tickets — all in one place." />
      <Notice error={params.error} message={params.message} />
      {profileError && <p className="notice notice-error">Profile details could not be loaded.</p>}
      <div className="dashboard-grid">
        <div>
          <section className="panel">
            <h2>Your profile</h2>
            <form className="form-stack" action={updateProfileAction}>
              <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} minLength={2} maxLength={100} required /></div>
              <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" value={user.email ?? ""} readOnly /><span className="field-hint">Contact support to change your verified email address.</span></div>
              <div className="field"><label htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={30} /></div>
              <button className="button button-dark" type="submit">Save profile</button>
            </form>
          </section>
          <section className="panel">
            <h2>Need a hand?</h2>
            <p className="muted text-small">Our support team can help with orders, payment questions, and your tickets.</p>
            <Link className="button button-outline button-small" href="/support">Visit customer support ↗</Link>
          </section>
        </div>
        <section className="panel">
          <div className="panel-heading-row"><h2>Your orders</h2>{ticketsError ? <span className="field-hint">Tickets unavailable</span> : <Link className="text-link" href="/tickets">{ticketCount ?? 0} tickets ↗</Link>}</div>
          {ordersError && <p className="notice notice-error">Orders could not be loaded. Please refresh to try again.</p>}
          {!ordersError && (!orders || orders.length === 0) && <p className="muted text-small">No orders yet. Find your next favorite event on the <Link className="text-link" href="/#events">event page</Link>.</p>}
          {(orders as Order[] | null)?.map((order) => {
            const event = Array.isArray(order.events) ? order.events[0] : order.events;
            return (
              <div className="list-row" key={order.id}>
                <div>
                  <h3>{event?.name ?? "Event ticket"}</h3>
                  <p>{order.quantity} ticket{order.quantity === 1 ? "" : "s"} · {money(order.total_cents)}<br />{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="order-list-right">
                  <span className={`status status-${order.status}`}>{order.status.replace("_", " ")}</span>
                  <Link className="text-link" href={`/orders/${order.id}`}>View order ↗</Link>
                </div>
              </div>
            );
          })}
          {orders && orders.length === 50 && <p className="field-hint">Showing your 50 most recent orders.</p>}
        </section>
      </div>
    </div>
  );
}
