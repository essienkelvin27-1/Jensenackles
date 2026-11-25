import type { Metadata } from "next";
import { updateCustomerAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Customer management" };

export default async function AdminCustomers({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: customers, error } = await supabase.from("profiles")
    .select("id,email,full_name,phone,created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeading eyebrow="People" title="Customer management." description="View customer accounts and contact details. Customer data is only visible to signed-in administrators." />
      <Notice error={params.error} message={params.message} />
      <section className="panel">
        {error && <p className="notice notice-error">Customer list could not be loaded.</p>}
        <div className="data-table-wrap"><table className="data-table customer-table">
          <thead><tr><th colSpan={3}>Customer details</th><th>Joined</th></tr></thead>
          <tbody>{customers?.map((customer) => (
            <tr key={customer.id}>
              <td colSpan={3}>
                <form action={updateCustomerAction} className="customer-edit-form">
                  <input type="hidden" name="customer_id" value={customer.id} />
                  <input name="full_name" aria-label={`Name for ${customer.email}`} defaultValue={customer.full_name} minLength={2} maxLength={100} required />
                  <span>{customer.email}</span>
                  <input name="phone" aria-label={`Phone for ${customer.email}`} defaultValue={customer.phone ?? ""} maxLength={30} placeholder="Phone (optional)" />
                  <button className="button button-outline button-small" type="submit">Save</button>
                </form>
              </td>
              <td>{new Date(customer.created_at).toLocaleDateString()}</td>
            </tr>
          ))}</tbody>
        </table></div>
        {!error && (!customers || customers.length === 0) && <p className="muted text-small">No customer accounts yet.</p>}
        {customers && customers.length === 200 && <p className="field-hint">Showing the newest 200 customers.</p>}
      </section>
    </>
  );
}
