import { requireAdmin } from "../../lib/permissions";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
