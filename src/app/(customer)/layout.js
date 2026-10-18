import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CustomerHeader from "@/components/customer/CustomerHeader";

export default async function CustomerLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="customer-layout">
      <CustomerHeader user={session?.user} />
      <main id="main-content" className="customer-content">
        {children}
      </main>
    </div>
  );
}
