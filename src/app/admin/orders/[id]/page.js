import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/permissions";
import StatusBadge from "../../../../components/orders/StatusBadge";
import { allowedNext } from "../../../../lib/order-admin";
import {
  STATUS_LABELS,
  formatDate,
  formatDateTime,
  money,
} from "../../../../lib/order-status";
import { updateOrderStatus } from "../actions";
import DeliveryPanel from "./DeliveryPanel";
import styles from "./admin-order.module.scss";

export const metadata = { title: "Order | Admin" };

export default async function AdminOrderPage({ params, searchParams }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, email: true } },
      orderItems: { orderBy: { createdAt: "asc" } },
      customRequests: { orderBy: { createdAt: "asc" } },
      delivery: true,
    },
  });
  if (!order) notFound();

  const history = await prisma.orderStatusHistory.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "asc" },
    include: { changedBy: { select: { username: true } } },
  });

  const returnTo = `/admin/orders/${order.id}`;
  const next = allowedNext(order.status);

  return (
    <main className={styles.page}>
      <Link href="/admin/orders" className={styles.back}>
        ← All orders
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

      {sp.error && (
        <p className={styles.error} role="alert">
          {sp.error}
        </p>
      )}
      {sp.notice && (
        <p className={styles.notice} role="status">
          {sp.notice}
        </p>
      )}

      <div className={styles.grid}>
        <section
          className={`${styles.card} ${styles.wide}`}
          aria-labelledby="actions"
        >
          <h2 id="actions">Change status</h2>
          <div className={styles.actions}>
            {next.map((status) => (
              <form key={status} action={updateOrderStatus}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={status === "CANCELLED" ? styles.danger : ""}
                >
                  {status === "CANCELLED"
                    ? "Cancel order"
                    : `Mark ${STATUS_LABELS[status]}`}
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="customer">
          <h2 id="customer">Customer</h2>
          <p>
            <strong>{order.fullName}</strong>
          </p>
          <p>
            <span className={styles.label}>Account</span>@{order.user.username}{" "}
            · {order.user.email}
          </p>
          <p>
            <span className={styles.label}>Phone</span>
            {order.phone}
          </p>
          <p>
            <span className={styles.label}>WhatsApp</span>
            {order.whatsapp || "-"}
          </p>
          <p>
            <span className={styles.label}>Address</span>
            {order.address}
          </p>
          <p>
            <span className={styles.label}>Postcode</span>
            {order.postcode}
          </p>
        </section>

        <section className={styles.card} aria-labelledby="delivery">
          <h2 id="delivery">Delivery</h2>
          {order.delivery ? (
            <>
              <p>
                <span className={styles.label}>Date</span>
                {order.delivery.deliveryDate
                  ? formatDate(order.delivery.deliveryDate)
                  : "Not set"}
              </p>
              <p>
                <span className={styles.label}>Time or window</span>
                {order.delivery.deliveryTime || "Not set"}
              </p>
              <p>
                <span className={styles.label}>Delivery status</span>
                {order.delivery.status}
              </p>
            </>
          ) : (
            <p>Not scheduled yet.</p>
          )}
          {order.notes && (
            <p>
              <span className={styles.label}>Customer notes</span>
              {order.notes}
            </p>
          )}
        </section>
        <DeliveryPanel order={order} returnTo={returnTo} />
        <section
          className={`${styles.card} ${styles.wide}`}
          aria-labelledby="items"
        >
          <h2 id="items">Products</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit price</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productNameSnapshot}</td>
                    <td>
                      {Number(item.quantity)} {item.unit}
                    </td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.total}>
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </p>
        </section>

        {order.customRequests.length > 0 && (
          <section
            className={`${styles.card} ${styles.wide}`}
            aria-labelledby="requests"
          >
            <h2 id="requests">Custom requests</h2>
            {order.customRequests.map((request) => (
              <div key={request.id} className={styles.request}>
                <p>
                  <strong>{request.itemName}</strong> · {request.quantity}
                </p>
                {request.note && <p>{request.note}</p>}
              </div>
            ))}
          </section>
        )}

        <section
          className={`${styles.card} ${styles.wide}`}
          aria-labelledby="history"
        >
          <h2 id="history">Status history</h2>
          <ul className={styles.history}>
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>{STATUS_LABELS[entry.status]}</strong>
                <span>
                  {formatDateTime(entry.createdAt)} · by @
                  {entry.changedBy.username}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
