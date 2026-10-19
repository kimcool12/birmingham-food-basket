import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/permissions";
import StatusBadge from "../../../components/orders/StatusBadge";
import { formatDateTime, money } from "../../../lib/order-status";
import styles from "./orders.module.scss";

export const metadata = {
  title: "My Orders | Birmingham Food Basket",
  robots: { index: false },
};

const PAGE_SIZE = 10;

export default async function OrdersPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = { userId: user.id };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { orderItems: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className={styles.page}>
      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>You have not placed any orders yet.</p>
          <Link href="/shop" className={styles.link}>
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className={styles.card}>
                <div>
                  <h2 className={styles.title}>Order #{order.orderNumber}</h2>
                  <p className={styles.meta}>
                    {formatDateTime(order.createdAt)} ·{" "}
                    {order._count.orderItems} item
                    {order._count.orderItems === 1 ? "" : "s"}
                  </p>
                </div>
                <div className={styles.right}>
                  <StatusBadge status={order.status} />
                  <strong>{money(order.total)}</strong>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && <Link href={`/orders?page=${page - 1}`}>Previous</Link>}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={`/orders?page=${page + 1}`}>Next</Link>}
        </nav>
      )}
    </main>
  );
}
