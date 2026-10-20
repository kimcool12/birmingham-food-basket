import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import { formatDate, formatDateTime, money } from "../../../lib/order-status";
import styles from "./customers.module.scss";

export const metadata = { title: "Customers | Admin" };

const PAGE_SIZE = 20;
const SORTS = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: { username: "asc" },
};

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

export default async function AdminCustomersPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const q = String(sp.q ?? "").trim();
  const has = ["ordered", "never"].includes(sp.has) ? sp.has : "";
  const sort = SORTS[sp.sort] ? sp.sort : "newest";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = { role: "CUSTOMER" };
  if (q) {
    const like = { contains: q, mode: "insensitive" };
    where.OR = [
      { email: like },
      { username: like },
      { whatsapp: like },
      {
        profile: {
          is: {
            OR: [
              { fullName: like },
              { phone: like },
              { address: like },
              { postcode: like },
            ],
          },
        },
      },
    ];
  }
  if (has === "ordered") where.orders = { some: {} };
  if (has === "never") where.orders = { none: {} };

  const [total, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        username: true,
        whatsapp: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
            address: true,
            postcode: true,
          },
        },
      },
    }),
  ]);

  const stats = customers.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: customers.map((c) => c.id) },
          status: { not: "CANCELLED" },
        },
        _count: { _all: true },
        _sum: { total: true },
        _max: { createdAt: true },
      })
    : [];
  const statsById = new Map(stats.map((s) => [s.userId, s]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { q, has, sort: sort === "newest" ? "" : sort };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Customers</h1>

      <form method="get" className={styles.filters} role="search">
        <label className={styles.field}>
          Search
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, email, phone, address, postcode"
          />
        </label>
        <label className={styles.field}>
          Orders
          <select name="has" defaultValue={has}>
            <option value="">All customers</option>
            <option value="ordered">Have ordered</option>
            <option value="never">Never ordered</option>
          </select>
        </label>
        <label className={styles.field}>
          Sort
          <select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Username A to Z</option>
          </select>
        </label>
        <button type="submit">Filter</button>
        <Link href="/admin/customers" className={styles.btn}>
          Clear
        </Link>
      </form>

      <p className={styles.count}>
        {total} customer{total === 1 ? "" : "s"}
      </p>

      {customers.length === 0 ? (
        <p className={styles.empty}>No customers found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Address</th>
                <th scope="col">Postcode</th>
                <th scope="col">Registered</th>
                <th scope="col">Orders</th>
                <th scope="col">Total value</th>
                <th scope="col">Latest order</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const stat = statsById.get(customer.id);
                return (
                  <tr key={customer.id}>
                    <td>
                      {customer.profile?.fullName || "-"}
                      <span className={styles.small}>@{customer.username}</span>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.profile?.phone || "-"}</td>
                    <td>{customer.whatsapp || "-"}</td>
                    <td className={styles.address}>
                      {customer.profile?.address || "-"}
                    </td>
                    <td>{customer.profile?.postcode || "-"}</td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>{stat?._count._all ?? 0}</td>
                    <td>{money(stat?._sum.total ?? 0)}</td>
                    <td>
                      {stat?._max.createdAt
                        ? formatDateTime(stat._max.createdAt)
                        : "-"}
                    </td>
                    <td>
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(customer.username)}`}
                        className={styles.btn}
                      >
                        View orders
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.note}>
        Orders, total value and latest order do not include cancelled orders.
      </p>

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link
              href={`/admin/customers${buildQuery(filters, { page: page - 1 })}`}
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
              href={`/admin/customers${buildQuery(filters, { page: page + 1 })}`}
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
