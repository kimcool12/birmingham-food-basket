import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/permissions";
import { formatDateTime } from "../../../lib/order-status";
import { markRead, markAllRead } from "./actions";
import styles from "./notifications.module.scss";

export const metadata = {
  title: "Notifications | Birmingham Food Basket",
  robots: { index: false },
};

const PAGE_SIZE = 20;

function href(unreadOnly, page) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unread", "1");
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/notifications?${text}` : "/notifications";
}

export default async function NotificationsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const unreadOnly = sp.unread === "1";

  const where = { userId: user.id, ...(unreadOnly ? { read: false } : {}) };

  const [total, unreadTotal, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { order: { select: { orderNumber: true } } },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h1>Notifications</h1>
        <p className={styles.count} role="status">
          {unreadTotal === 0
            ? "No unread notifications"
            : `${unreadTotal} unread`}
        </p>
      </div>

      <div className={styles.tools}>
        {unreadTotal > 0 && (
          <form action={markAllRead}>
            <button type="submit">Mark all as read</button>
          </form>
        )}
        <Link href={href(!unreadOnly, 1)} className={styles.btn}>
          {unreadOnly ? "Show all" : "Show unread only"}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>
          {unreadOnly
            ? "You have no unread notifications."
            : "You have no notifications yet."}
        </p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id}>
              <article
                className={`${styles.item} ${item.read ? "" : styles.unread}`}
              >
                <span
                  className={`${styles.tag} ${item.read ? styles.tagRead : styles.tagUnread}`}
                >
                  {item.read ? "Read" : "Unread"}
                </span>
                <p className={styles.message}>{item.message}</p>
                <div className={styles.meta}>
                  <span>{formatDateTime(item.createdAt)}</span>
                  {item.orderId && item.order && (
                    <Link href={`/orders/${item.orderId}`}>
                      View order #{item.order.orderNumber}
                    </Link>
                  )}
                  {!item.read && (
                    <form action={markRead}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit">Mark as read</button>
                    </form>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link href={href(unreadOnly, page - 1)} className={styles.btn}>
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={href(unreadOnly, page + 1)} className={styles.btn}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
