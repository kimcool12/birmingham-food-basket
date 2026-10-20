import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import StatusBadge from "../../../components/orders/StatusBadge";
import {
  STATUS_LABELS,
  formatDateTime,
  money,
} from "../../../lib/order-status";
import styles from "./dashboard.module.scss";

export const metadata = { title: "Dashboard | Admin" };

function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    new Date(),
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const today = londonToday();
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  const [
    customers,
    orders,
    byStatus,
    products,
    unavailable,
    recentOrders,
    todaysDeliveries,
    popular,
    recentRequests,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({
      where: { isActive: true, availability: "UNAVAILABLE" },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.delivery.findMany({
      where: {
        deliveryDate: todayDate,
        order: { status: { not: "CANCELLED" } },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            fullName: true,
            postcode: true,
            status: true,
          },
        },
      },
      orderBy: { deliveryTime: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productNameSnapshot", "unit"],
      where: { order: { status: { not: "CANCELLED" } } },
      _sum: { quantity: true },
      _count: { _all: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.customRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        order: { select: { id: true, orderNumber: true, fullName: true } },
      },
    }),
  ]);

  const count = (status) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  const cards = [
    { label: "Total Customers", value: customers, href: "/admin/customers" },
    { label: "Total Orders", value: orders, href: "/admin/orders" },
    {
      label: "Pending (Order Placed)",
      value: count("ORDER_PLACED"),
      href: "/admin/orders?status=ORDER_PLACED",
      warn: count("ORDER_PLACED") > 0,
    },
    {
      label: "Confirmed",
      value: count("CONFIRMED"),
      href: "/admin/orders?status=CONFIRMED",
    },
    {
      label: "Preparing",
      value: count("PREPARING"),
      href: "/admin/orders?status=PREPARING",
    },
    {
      label: "Ready",
      value: count("READY"),
      href: "/admin/orders?status=READY",
    },
    {
      label: "Out for Delivery",
      value: count("OUT_FOR_DELIVERY"),
      href: "/admin/orders?status=OUT_FOR_DELIVERY",
    },
    {
      label: "Delivered",
      value: count("DELIVERED"),
      href: "/admin/orders?status=DELIVERED",
    },
    { label: "Total Products", value: products, href: "/admin/products" },
    {
      label: "Unavailable Products",
      value: unavailable,
      href: "/admin/products?availability=UNAVAILABLE",
      warn: unavailable > 0,
    },
  ];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.cards}>
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`${styles.card} ${card.warn ? styles.warn : ""}`}
          >
            <span className={styles.label}>{card.label}</span>
            <span className={styles.value}>{card.value}</span>
          </Link>
        ))}
      </div>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="today">
          <h2 id="today">Today&apos;s deliveries</h2>
          {todaysDeliveries.length === 0 ? (
            <p className={styles.empty}>No deliveries scheduled for today.</p>
          ) : (
            <ul className={styles.list}>
              {todaysDeliveries.map((d) => (
                <li key={d.id} className={styles.row}>
                  <div>
                    <Link href={`/admin/orders/${d.order.id}`}>
                      Order #{d.order.orderNumber}
                    </Link>
                    <span className={styles.small}>
                      {d.order.fullName} · {d.order.postcode}
                      {d.deliveryTime ? ` · ${d.deliveryTime}` : ""}
                    </span>
                  </div>
                  <StatusBadge status={d.order.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="recent">
          <h2 id="recent">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className={styles.empty}>No orders yet.</p>
          ) : (
            <ul className={styles.list}>
              {recentOrders.map((o) => (
                <li key={o.id} className={styles.row}>
                  <div>
                    <Link href={`/admin/orders/${o.id}`}>
                      Order #{o.orderNumber}
                    </Link>
                    <span className={styles.small}>
                      {o.fullName} · {formatDateTime(o.createdAt)} ·{" "}
                      {money(o.total)}
                    </span>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/orders" className={styles.more}>
            All orders
          </Link>
        </section>

        <section className={styles.panel} aria-labelledby="popular">
          <h2 id="popular">Popular products</h2>
          {popular.length === 0 ? (
            <p className={styles.empty}>No orders yet.</p>
          ) : (
            <ul className={styles.list}>
              {popular.map((p) => (
                <li
                  key={`${p.productNameSnapshot}|${p.unit}`}
                  className={styles.row}
                >
                  <div>
                    {p.productNameSnapshot}
                    <span className={styles.small}>
                      in {p._count._all} order{p._count._all === 1 ? "" : "s"}
                    </span>
                  </div>
                  <strong>
                    {Number(p._sum.quantity)} {p.unit}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="requests">
          <h2 id="requests">Recent custom requests</h2>
          {recentRequests.length === 0 ? (
            <p className={styles.empty}>No custom requests yet.</p>
          ) : (
            <ul className={styles.list}>
              {recentRequests.map((r) => (
                <li key={r.id} className={styles.row}>
                  <div>
                    <strong>{r.itemName}</strong> · {r.quantity}
                    <span className={styles.small}>
                      <Link href={`/admin/orders/${r.order.id}`}>
                        Order #{r.order.orderNumber}
                      </Link>{" "}
                      · {r.order.fullName}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
