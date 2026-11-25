import { requireAdmin } from "@/lib/auth";
import AdminNav from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <div className="page-shell">
      <AdminNav />
      {children}
    </div>
  );
}
