import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import StatusBadge from "../../../components/orders/StatusBadge";
import { allowedNext } from "../../../lib/order-admin";
import {
  STATUS_LABELS,
  formatDate,
  formatDateTime,
  money,
} from "../../../lib/order-status";
import { updateOrderStatus } from "./actions";
import styles from "./orders.module.scss";

export const metadata = { title: "Orders | Admin" };

const PAGE_SIZE = 20;
const STATUSES = Object.keys(STATUS_LABELS);
const SORTS = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  total_desc: { total: "desc" },
  total_asc: { total: "asc" },
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

export default async function AdminOrdersPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const q = String(sp.q ?? "").trim();
  const status = STATUSES.includes(sp.status) ? sp.status : "";
  const from = DATE_RE.test(sp.from ?? "") ? sp.from : "";
  const to = DATE_RE.test(sp.to ?? "") ? sp.to : "";
  const sort = SORTS[sp.sort] ? sp.sort : "newest";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {};
  if (q) {
    const num = /^#?\d{1,9}$/.test(q) ? parseInt(q.replace("#", ""), 10) : null;
    const like = { contains: q, mode: "insensitive" };
    where.OR = [
      ...(num !== null ? [{ orderNumber: num }] : []),
      { fullName: like },
      { phone: like },
      { whatsapp: like },
      { address: like },
      { postcode: like },
      { user: { email: like } },
      { user: { username: like } },
      { orderItems: { some: { productNameSnapshot: like } } },
    ];
  }
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { username: true } },
        delivery: { select: { deliveryDate: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { q, status, from, to, sort: sort === "newest" ? "" : sort };
  const returnTo = `/admin/orders${buildQuery(filters, { page: page > 1 ? page : "" })}`;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Orders</h1>

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

      <form method="get" className={styles.filters} role="search">
        <label className={styles.field}>
          Search
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order #, name, phone, address, postcode, product"
          />
        </label>
        <label className={styles.field}>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          From
          <input name="from" type="date" defaultValue={from} />
        </label>
        <label className={styles.field}>
          To
          <input name="to" type="date" defaultValue={to} />
        </label>
        <label className={styles.field}>
          Sort
          <select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="total_desc">Highest total</option>
            <option value="total_asc">Lowest total</option>
          </select>
        </label>
        <button type="submit">Filter</button>
        <Link href="/admin/orders" className={styles.btn}>
          Clear
        </Link>
      </form>

      <p className={styles.count}>
        {total} order{total === 1 ? "" : "s"}
      </p>

      {orders.length === 0 ? (
        <p className={styles.empty}>No orders found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Phone</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Address</th>
                <th scope="col">Postcode</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Delivery</th>
                <th scope="col">Created</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const next = allowedNext(order.status);
                return (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.orderNumber}</strong>
                    </td>
                    <td>
                      {order.fullName}
                      <span className={styles.small}>
                        @{order.user.username}
                      </span>
                    </td>
                    <td>{order.phone}</td>
                    <td>{order.whatsapp || "-"}</td>
                    <td className={styles.address}>{order.address}</td>
                    <td>{order.postcode}</td>
                    <td>{money(order.total)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      {order.delivery?.deliveryDate
                        ? formatDate(order.delivery.deliveryDate)
                        : "-"}
                    </td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className={styles.btn}
                      >
                        View
                      </Link>
                      {next.length > 0 ? (
                        <form
                          action={updateOrderStatus}
                          className={styles.inline}
                        >
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={returnTo}
                          />
                          <select
                            name="status"
                            aria-label={`Change status of order ${order.orderNumber}`}
                          >
                            {next.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <button type="submit">Change</button>
                        </form>
                      ) : (
                        <span className={styles.final}>Final</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link
              href={`/admin/orders${buildQuery(filters, { page: page - 1 })}`}
              className={styles.btn}
            >
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/admin/orders${buildQuery(filters, { page: page + 1 })}`}
              className={styles.btn}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
