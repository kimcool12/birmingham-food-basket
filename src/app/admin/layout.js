import { requireAdmin } from "../../lib/permissions";

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return <>{children}</>;
}
