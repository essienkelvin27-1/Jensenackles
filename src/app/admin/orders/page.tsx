import type { Metadata } from "next";
import { reviewOrderAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Order and payment management" };

type Payment = {
  id: string;
  submitted_at: string;
  method: string;
  reference: string | null;
  amount_cents: number;
  evidence_path: string | null;
  status: string;
  admin_note: string | null;
  gift_card_submissions: { issuer: string; card_code: string; amount_cents: number; image_path: string }[];
};
type AdminOrder = {
  id: string;
  status: string;
  quantity: number;
  total_cents: number;
  created_at: string;
  profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  events: { name: string } | { name: string }[] | null;
  payment_submissions: Payment[];
};

export default async function AdminOrders({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("orders")
    .select("id,status,quantity,total_cents,created_at,profiles(full_name,email),events(name),payment_submissions(id,method,reference,amount_cents,evidence_path,status,admin_note,submitted_at,gift_card_submissions(issuer,card_code,amount_cents,image_path))")
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data ?? []) as unknown as AdminOrder[];
  const money = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(cents / 100);
  return (
    <>
      <PageHeading eyebrow="Customer orders" title="Orders & payment review." description="Bank transfers and gift card submissions remain unconfirmed until an administrator checks the payment evidence." />
      <Notice error={params.error} message={params.message} />
      {error && <p className="notice notice-error">Orders could not be loaded. Confirm the latest database migration is applied.</p>}
      {!error && orders.length === 0 && <div className="empty-state"><span className="empty-icon">✳</span><h3>No orders yet.</h3><p>Customer orders will appear here.</p></div>}
      <div className="admin-order-list">
        {orders.map(async (order) => {
          const customer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
          const event = Array.isArray(order.events) ? order.events[0] : order.events;
          const payment = order.payment_submissions?.find((submission) => submission.status === "under_review")
            ?? [...(order.payment_submissions ?? [])].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
          const evidencePaths = [
            ...(payment?.evidence_path ? [payment.evidence_path] : []),
            ...(payment?.gift_card_submissions?.map((card) => card.image_path) ?? []),
          ];
          const evidenceResults = await Promise.all(evidencePaths.map((path) => supabase.storage.from("payment-evidence").createSignedUrl(path, 300)));
          return (
            <section className="panel admin-order" key={order.id}>
              <div className="order-topline">
                <div><span className="eyebrow">Order {order.id.slice(0, 8).toUpperCase()}</span><h2>{event?.name ?? "Event"} · {order.quantity} ticket{order.quantity === 1 ? "" : "s"}</h2><p>{customer?.full_name || "Customer"} · {customer?.email ?? "Email unavailable"} · {new Date(order.created_at).toLocaleString()}</p></div>
                <div className="order-list-right"><strong>{money(order.total_cents)}</strong><span className={`status status-${order.status}`}>{order.status.replace("_", " ")}</span></div>
              </div>
              {payment && (
                <div className="payment-review">
                  <p><strong>{payment.method.replace("_", " ")}</strong> · {money(payment.amount_cents)} · submitted {payment.status.replace("_", " ")}</p>
                  {payment.reference && <p>Transfer reference: <code>{payment.reference}</code></p>}
                  {payment.admin_note && <p>Previous review note: {payment.admin_note}</p>}
                  {payment.evidence_path && (
                    evidenceResults[0]?.data?.signedUrl
                      ? <a className="evidence-link" href={evidenceResults[0].data.signedUrl} target="_blank" rel="noreferrer">View transfer receipt ↗</a>
                      : <p className="notice notice-error">Transfer receipt unavailable: {evidenceResults[0]?.error?.message ?? "signed link could not be created."}</p>
                  )}
                  {payment.gift_card_submissions?.map((card, index) => {
                    const signed = evidenceResults[index + (payment.evidence_path ? 1 : 0)];
                    return (
                      <div className="gift-review-row" key={`${payment.id}-${index}`}>
                        <div><strong>{card.issuer}</strong> · {money(card.amount_cents)}<p>Code: <code>{card.card_code}</code></p></div>
                        {signed?.data?.signedUrl
                          ? <a className="evidence-link" href={signed.data.signedUrl} target="_blank" rel="noreferrer">View card image ↗</a>
                          : <span className="field-hint">Image unavailable: {signed?.error?.message ?? "could not create signed link"}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {order.status === "under_review" && (
                <form action={reviewOrderAction} className="inline-form review-form">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input name="note" maxLength={500} placeholder="Optional note for customer" aria-label="Optional review note" />
                  <button className="button button-dark button-small" name="approved" value="true" type="submit">Approve & issue tickets</button>
                  <button className="button button-outline button-small" name="approved" value="false" type="submit">Reject payment</button>
                </form>
              )}
              {order.status === "paid" && <p className="status status-paid">Verified — tickets issued</p>}
              {!payment && order.status === "pending" && <p className="field-hint">Awaiting customer payment. Unpaid ticket holds expire after 30 minutes.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
