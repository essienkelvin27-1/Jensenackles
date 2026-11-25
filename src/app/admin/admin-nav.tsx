import Link from "next/link";

export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Administrator navigation">
      <Link href="/admin">Overview</Link>
      <Link href="/admin/customers">Customers</Link>
      <Link href="/admin/orders">Orders & payments</Link>
      <Link href="/admin/events">Events & inventory</Link>
      <Link href="/admin/qr">QR validation</Link>
      <Link href="/admin/support">Support</Link>
      <Link href="/admin/settings">Settings</Link>
    </nav>
  );
}
