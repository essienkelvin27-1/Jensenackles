import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeading } from "@/app/components";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administrator dashboard" };

type Analytics = {
  customers: number;
  events: number;
  orders: number;
  pending_payments: number;
  paid_revenue_cents: number;
  tickets_issued: number;
  tickets_checked_in: number;
};

export default async function AdminDashboard({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("get_admin_analytics");
  const stats = data as Analytics | null;
  const money = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
  return (
    <>
      <PageHeading eyebrow="TourTickets control room" title="Good morning, admin." description="A clear view of your events, customers, ticket sales, and support." />
      <Notice error={params.error} message={params.message} />
      {error && <p className="notice notice-error">Analytics could not be loaded. Confirm the latest database migration is applied.</p>}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><span>Paid revenue</span><strong>{money(stats.paid_revenue_cents)}</strong></div>
          <div className="stat-card"><span>Pending payments</span><strong>{stats.pending_payments}</strong></div>
          <div className="stat-card"><span>Orders</span><strong>{stats.orders}</strong></div>
          <div className="stat-card"><span>Customers</span><strong>{stats.customers}</strong></div>
          <div className="stat-card"><span>Events</span><strong>{stats.events}</strong></div>
          <div className="stat-card"><span>Tickets issued</span><strong>{stats.tickets_issued}</strong></div>
          <div className="stat-card"><span>Checked in</span><strong>{stats.tickets_checked_in}</strong></div>
          <div className="stat-card"><span>Check-in rate</span><strong>{stats.tickets_issued ? `${Math.round(stats.tickets_checked_in / stats.tickets_issued * 100)}%` : "—"}</strong></div>
        </div>
      )}
      <section className="panel">
        <h2>Quick actions</h2>
        <div className="quick-links">
          <Link className="button button-dark button-small" href="/admin/orders">Review payments ↗</Link>
          <Link className="button button-outline button-small" href="/admin/events">Create an event ↗</Link>
          <Link className="button button-outline button-small" href="/admin/qr">Validate a ticket ↗</Link>
          <Link className="button button-outline button-small" href="/admin/support">Reply to customers ↗</Link>
        </div>
      </section>
    </>
  );
}
