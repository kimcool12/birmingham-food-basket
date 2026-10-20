import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import StatusBadge from "../../../components/orders/StatusBadge";
import { londonToday } from "../../../lib/aggregate";
import { formatDate } from "../../../lib/order-status";
import { saveSchedule, markStatus, sendNotice } from "./actions";
import styles from "./deliveries.module.scss";

export const metadata = { title: "Deliveries | Admin" };

const PAGE_SIZE = 25;
const VIEWS = {
  upcoming: "Upcoming",
  today: "Today",
  unscheduled: "Needs scheduling",
  overdue: "Overdue",
  delivered: "Delivered",
  all: "All",
};
const COUNTED = ["upcoming", "today", "unscheduled", "overdue"];
const DELIVERY_LABELS = {
  SCHEDULED: "Scheduled",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

function whereFor(view, todayDate) {
  const open = { status: { notIn: ["CANCELLED", "DELIVERED"] } };
  switch (view) {
    case "today":
      return {
        status: { not: "CANCELLED" },
        delivery: { is: { deliveryDate: todayDate } },
      };
    case "unscheduled":
      return {
        status: { in: ["CONFIRMED", "PREPARING", "READY"] },
        OR: [
          { delivery: { is: null } },
          { delivery: { is: { deliveryDate: null } } },
        ],
      };
    case "overdue":
      return { ...open, delivery: { is: { deliveryDate: { lt: todayDate } } } };
    case "delivered":
      return { status: "DELIVERED" };
    case "all":
      return { status: { not: "CANCELLED" } };
    default:
      return {
        ...open,
        delivery: { is: { deliveryDate: { gte: todayDate } } },
      };
  }
}

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

export default async function DeliveriesPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const view = VIEWS[sp.view] ? sp.view : "upcoming";
  const q = String(sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const todayDate = new Date(`${londonToday()}T00:00:00.000Z`);

  const conditions = [whereFor(view, todayDate)];
  if (q) {
    const num = /^#?\d{1,9}$/.test(q) ? parseInt(q.replace("#", ""), 10) : null;
    const like = { contains: q, mode: "insensitive" };
    conditions.push({
      OR: [
        ...(num !== null ? [{ orderNumber: num }] : []),
        { fullName: like },
        { phone: like },
        { whatsapp: like },
        { address: like },
        { postcode: like },
      ],
    });
  }
  const where = { AND: conditions };

  const newestFirst = view === "delivered" || view === "all";

  const [total, orders, ...counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: newestFirst
        ? [{ createdAt: "desc" }]
        : [{ delivery: { deliveryDate: "asc" } }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { delivery: true },
    }),
    ...COUNTED.map((v) =>
      prisma.order.count({ where: whereFor(v, todayDate) }),
    ),
  ]);
  const countFor = Object.fromEntries(COUNTED.map((v, i) => [v, counts[i]]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { view: view === "upcoming" ? "" : view, q };
  const returnTo = `/admin/deliveries${buildQuery(filters, { page: page > 1 ? page : "" })}`;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Deliveries</h1>

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

      <nav className={styles.tabs} aria-label="Delivery views">
        {Object.entries(VIEWS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/deliveries${buildQuery({ q }, { view: key === "upcoming" ? "" : key })}`}
            className={`${styles.tab} ${view === key ? styles.tabActive : ""}`}
            aria-current={view === key ? "page" : undefined}
          >
            {label}
            {key in countFor ? ` (${countFor[key]})` : ""}
          </Link>
        ))}
      </nav>

      <form method="get" className={styles.filters} role="search">
        {view !== "upcoming" && (
          <input type="hidden" name="view" value={view} />
        )}
        <label>
          <span className="sr-only" hidden>
            Search deliveries
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order #, name, phone, address, postcode"
          />
        </label>
        <button type="submit">Search</button>
        <Link
          href={`/admin/deliveries${buildQuery({ view: filters.view })}`}
          className={styles.btn}
        >
          Clear
        </Link>
      </form>

      <p className={styles.count}>
        {total} order{total === 1 ? "" : "s"} in &quot;{VIEWS[view]}&quot;
      </p>

      {orders.length === 0 ? (
        <p className={styles.empty}>No deliveries in this view.</p>
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
                <th scope="col">Delivery date</th>
                <th scope="col">Delivery time</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const d = order.delivery;
                const dateValue = d?.deliveryDate
                  ? d.deliveryDate.toISOString().slice(0, 10)
                  : "";
                const canOut = ![
                  "OUT_FOR_DELIVERY",
                  "DELIVERED",
                  "CANCELLED",
                ].includes(order.status);
                const canDeliver = !["DELIVERED", "CANCELLED"].includes(
                  order.status,
                );

                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>
                        <strong>#{order.orderNumber}</strong>
                      </Link>
                    </td>
                    <td>{order.fullName}</td>
                    <td>{order.phone}</td>
                    <td>{order.whatsapp || "-"}</td>
                    <td className={styles.address}>{order.address}</td>
                    <td>{order.postcode}</td>
                    <td>
                      {d?.deliveryDate ? formatDate(d.deliveryDate) : "Not set"}
                    </td>
                    <td>{d?.deliveryTime || "-"}</td>
                    <td>
                      <StatusBadge status={order.status} />
                      {d && (
                        <span className={styles.small}>
                          Delivery: {DELIVERY_LABELS[d.status] ?? d.status}
                        </span>
                      )}
                      {d?.notificationSent && (
                        <span className={styles.small}>Customer notified</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {order.status === "DELIVERED" ? (
                          <span className={styles.final}>Delivered</span>
                        ) : (
                          <>
                            <form action={saveSchedule}>
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
                              <input
                                type="date"
                                name="date"
                                defaultValue={dateValue}
                                required
                                aria-label={`Delivery date for order ${order.orderNumber}`}
                              />
                              <input
                                name="time"
                                defaultValue={d?.deliveryTime ?? ""}
                                maxLength={40}
                                placeholder="Time window"
                                aria-label={`Delivery time for order ${order.orderNumber}`}
                              />
                              <button type="submit">Save delivery</button>
                            </form>

                            {(canOut || canDeliver) && (
                              <div>
                                {canOut && (
                                  <form action={markStatus}>
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
                                    <input
                                      type="hidden"
                                      name="status"
                                      value="OUT_FOR_DELIVERY"
                                    />
                                    <button type="submit">
                                      Mark out for delivery
                                    </button>
                                  </form>
                                )}
                                {canDeliver && (
                                  <form action={markStatus}>
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
                                    <input
                                      type="hidden"
                                      name="status"
                                      value="DELIVERED"
                                    />
                                    <button
                                      type="submit"
                                      className={styles.primary}
                                    >
                                      Mark delivered
                                    </button>
                                  </form>
                                )}
                              </div>
                            )}

                            <form action={sendNotice}>
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
                                name="kind"
                                aria-label={`Message for order ${order.orderNumber}`}
                              >
                                <option value="approaching">
                                  Delivery approaching
                                </option>
                                <option value="scheduled">
                                  Delivery scheduled
                                </option>
                                <option value="call">We will call first</option>
                              </select>
                              <button type="submit">Notify</button>
                            </form>
                          </>
                        )}
                      </div>
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
              href={`/admin/deliveries${buildQuery(filters, { page: page - 1 })}`}
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
              href={`/admin/deliveries${buildQuery(filters, { page: page + 1 })}`}
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
