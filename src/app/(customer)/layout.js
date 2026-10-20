import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import CustomerHeader from "@/components/customer/CustomerHeader";
import NotificationRefresh from "@/components/customer/NotificationRefresh";

export default async function CustomerLayout({ children }) {
  const session = await getServerSession(authOptions);

  let unreadCount = 0;
  if (session?.user?.id) {
    unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });
  }

  return (
    <div className="customer-layout">
      <CustomerHeader user={session?.user} unreadCount={unreadCount} />
      {session?.user && <NotificationRefresh />}
      <main id="main-content" className="customer-content">
        {children}
      </main>
    </div>
  );
}
