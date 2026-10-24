import Link from 'next/link';
import prisma from '../../../lib/prisma';
import { requireAdmin } from '../../../lib/permissions';
import { formatDateTime } from '../../../lib/order-status';
import { sendToCustomer } from './actions';
import styles from './notifications.module.scss';

export const metadata = { title: 'Notifications | Admin' };

const PAGE_SIZE = 25;
const TYPES = [
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'ORDER_PREPARING',
  'ORDER_READY',
  'ORDER_OUT_FOR_DELIVERY',
  'ORDER_DELIVERED',
  'DELIVERY_APPROACHING',
  'CUSTOM',
];
const like = (value) => ({ contains: value, mode: 'insensitive' });

function label(type) {
  const words = type.toLowerCase().split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : '';
}

export default async function AdminNotificationsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const q = String(sp.q ?? '').trim();
  const type = TYPES.includes(sp.type) ? sp.type : '';
  const read = ['read', 'unread'].includes(sp.read) ? sp.read : '';
  const via = ['app', 'external'].includes(sp.via) ? sp.via : '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const and = [];
  if (type) and.push({ type });
  if (read) and.push({ read: read === 'read' });
  if (via) and.push({ externalSent: via === 'external' });
  if (q) {
    const num = /^#?\d{1,9}$/.test(q) ? parseInt(q.replace('#', ''), 10) : null;
    and.push({
      OR: [
        ...(num !== null ? [{ order: { orderNumber: num } }] : []),
        { message: like(q) },
        { user: { email: like(q) } },
        { user: { username: like(q) } },
      ],
    });
  }
  const where = and.length > 0 ? { AND: and } : {};

  const [total, unread, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { read: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { username: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { q, type, read, via };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Notifications</h1>

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

      <section className={styles.panel} aria-labelledby="send">
        <h2 id="send">Send a notification to a customer</h2>
        <form action={sendToCustomer} className={styles.sendForm}>
          <label className={styles.field}>
            Customer email
            <input name="email" type="email" required placeholder="customer@example.com" />
          </label>
          <label className={styles.field}>
            Message
            <textarea name="message" required minLength={3} maxLength={500} />
          </label>
          <button type="submit" className={styles.submit}>
            Send notification
          </button>
          <p className={styles.hint}>
            This creates a notification inside the app. WhatsApp, SMS and email are not connected, so
            nothing is sent outside the app.
          </p>
        </form>
      </section>

      <form method="get" className={styles.filters} role="search">
        <label className={styles.field}>
          Search
          <input name="q" type="search" defaultValue={q} placeholder="Customer, order #, message" />
        </label>
        <label className={styles.field}>
          Type
          <select name="type" defaultValue={type}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Read status
          <select name="read" defaultValue={read}>
            <option value="">Read and unread</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
        <label className={styles.field}>
          Delivery
          <select name="via" defaultValue={via}>
            <option value="">In app and outside</option>
            <option value="app">In app only</option>
            <option value="external">Sent outside the app</option>
          </select>
        </label>
        <button type="submit">Filter</button>
        <Link href="/admin/notifications" className={styles.btn}>
          Clear
        </Link>
      </form>

      <p className={styles.count} role="status">
        {total} notification{total === 1 ? '' : 's'} · {unread} unread across all customers
      </p>

      {items.length === 0 ? (
        <p className={styles.empty}>No notifications found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Customer</th>
                <th scope="col">Order</th>
                <th scope="col">Type</th>
                <th scope="col">Message</th>
                <th scope="col">Delivery</th>
                <th scope="col">Read</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id}>
                  <td className={styles.nowrap}>{formatDateTime(n.createdAt)}</td>
                  <td>
                    @{n.user.username}
                    <span className={styles.small}>{n.user.email}</span>
                  </td>
                  <td>
                    {n.order ? <Link href={`/admin/orders/${n.order.id}`}>#{n.order.orderNumber}</Link> : '-'}
                  </td>
                  <td>{label(n.type)}</td>
                  <td className={styles.message}>{n.message}</td>
                  <td>{n.externalSent ? 'Sent outside the app' : 'In app only'}</td>
                  <td>{n.read ? 'Read' : 'Unread'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link href={`/admin/notifications${buildQuery(filters, { page: page - 1 })}`} className={styles.btn}>
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/admin/notifications${buildQuery(filters, { page: page + 1 })}`} className={styles.btn}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
