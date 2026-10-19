import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/permissions";
import StatusBadge from "../../../../components/orders/StatusBadge";
import OrderTimeline from "../../../../components/orders/OrderTimeline";
import {
  formatDate,
  formatDateTime,
  money,
} from "../../../../lib/order-status";
import styles from "./order-detail.module.scss";

export const metadata = {
  title: "Order | Birmingham Food Basket",
  robots: { index: false },
};

export default async function OrderDetailPage({ params }) {
  const user = await requireUser();
  const { id } = await params;

  // The user id is part of the lookup, so another customer's order is never found.
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { orderItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const [history, customRequests, delivery] = await Promise.all([
    prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customRequest.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.delivery.findUnique({ where: { orderId: order.id } }),
  ]);

  return (
    <main className={styles.page}>
      <Link href="/orders" className={styles.back}>
        ← My Orders
      </Link>

      <div className={styles.head}>
        <div>
          <h1>Order #{order.orderNumber}</h1>
          <span className={styles.label}>
            Placed {formatDateTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="progress">
          <h2 id="progress">Order progress</h2>
          <OrderTimeline
            status={order.status}
            history={history}
            createdAt={order.createdAt}
          />
        </section>

        <section className={styles.card} aria-labelledby="delivery">
          <h2 id="delivery">Delivery details</h2>
          <p>
            <strong>{order.fullName}</strong>
          </p>
          <p>{order.address}</p>
          <p>{order.postcode}</p>
          <p>
            <span className={styles.label}>Phone</span>
            {order.phone}
          </p>
          {order.whatsapp && (
            <p>
              <span className={styles.label}>WhatsApp</span>
              {order.whatsapp}
            </p>
          )}
          {delivery && (delivery.deliveryDate || delivery.deliveryTime) && (
            <p>
              <span className={styles.label}>Scheduled delivery</span>
              {delivery.deliveryDate ? formatDate(delivery.deliveryDate) : ""}
              {delivery.deliveryTime ? ` · ${delivery.deliveryTime}` : ""}
            </p>
          )}
          {order.notes && (
            <p>
              <span className={styles.label}>Your notes</span>
              {order.notes}
            </p>
          )}
        </section>

        <section
          className={`${styles.card} ${styles.wide}`}
          aria-labelledby="items"
        >
          <h2 id="items">Products</h2>
          <ul className={styles.lines}>
            {order.orderItems.map((item) => (
              <li key={item.id} className={styles.line}>
                <div>
                  {item.productNameSnapshot}
                  <br />
                  <span>
                    {Number(item.quantity)} {item.unit} ×{" "}
                    {money(item.unitPrice)}
                  </span>
                </div>
                <strong>{money(item.total)}</strong>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </p>
        </section>

        {customRequests.length > 0 && (
          <section
            className={`${styles.card} ${styles.wide}`}
            aria-labelledby="requests"
          >
            <h2 id="requests">Custom requests</h2>
            {customRequests.map((request) => (
              <div key={request.id} className={styles.request}>
                <p>
                  <strong>{request.itemName}</strong> · {request.quantity}
                </p>
                {request.note && <p>{request.note}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
