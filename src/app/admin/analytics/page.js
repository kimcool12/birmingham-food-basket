import Link from 'next/link';
import prisma from '../../../lib/prisma';
import { requireAdmin } from '../../../lib/permissions';
import { RANGES, addDays, londonDayStart, londonToday } from '../../../lib/aggregate';
import { STATUS_LABELS, money } from '../../../lib/order-status';
import {
  categoryOrders,
  dailySeries,
  postcodeAreas,
  quantityTotals,
  summarise,
  topProducts,
} from '../../../lib/analytics';
import AnalyticsCharts from './AnalyticsCharts';
import styles from './analytics.module.scss';

export const metadata = { title: 'Analytics | Admin' };

const PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
];

export default async function AnalyticsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const requested = parseInt(sp.days ?? '30', 10);
  const days = PERIODS.some((p) => p.days === requested) ? requested : 30;

  const today = londonToday();
  const startDay = addDays(today, -(days - 1));
  const range = { gte: londonDayStart(startDay), lt: londonDayStart(addDays(today, 1)) };
  const orderWhere = { createdAt: range, status: { not: 'CANCELLED' } };

  const [orders, items] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      select: { id: true, userId: true, createdAt: true, total: true, postcode: true },
    }),
    prisma.orderItem.findMany({
      where: { order: orderWhere },
      select: {
        orderId: true,
        productNameSnapshot: true,
        unit: true,
        quantity: true,
        product: { select: { category: { select: { name: true } } } },
      },
    }),
  ]);

  const summary = summarise(orders);
  const daily = dailySeries(orders, startDay, days);
  const products = topProducts(items, 10);
  const categories = categoryOrders(items);
  const postcodes = postcodeAreas(orders, 15);
  const totals = quantityTotals(items).slice(0, 20);

  const cards = [
    { label: 'Orders', value: summary.orders },
    { label: 'Customers who ordered', value: summary.customers },
    { label: 'Order value', value: money(summary.valuePence / 100) },
    { label: 'Average order', value: money(summary.averagePence / 100) },
  ];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Analytics</h1>

      <nav className={styles.periods} aria-label="Time period">
        {PERIODS.map((p) => (
          <Link
            key={p.days}
            href={`/admin/analytics${p.days === 30 ? '' : `?days=${p.days}`}`}
            className={`${styles.period} ${p.days === days ? styles.periodActive : ''}`}
            aria-current={p.days === days ? 'page' : undefined}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <p className={styles.note}>
        Figures leave out cancelled orders and use UK time. Period: {startDay} to {today}.
      </p>

      <div className={styles.cards}>
        {cards.map((card) => (
          <div key={card.label} className={styles.card}>
            <span className={styles.label}>{card.label}</span>
            <span className={styles.value}>{card.value}</span>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className={styles.empty}>No orders in this period yet. Charts appear once orders come in.</p>
      ) : (
        <AnalyticsCharts
          daily={daily}
          products={products}
          categories={categories}
          postcodes={postcodes}
        />
      )}

      <section className={styles.panel} aria-labelledby="qty">
        <h2 id="qty">Product quantity totals</h2>
        <p className={styles.note}>Total quantity ordered per product, with its own unit.</p>
        {totals.length === 0 ? (
          <p className={styles.none}>No products ordered in this period.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Total ordered</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={`${t.name}|${t.unit}`}>
                    <td>{t.name}</td>
                    <td>
                      {t.total} {t.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="exports">
        <h2 id="exports">Download data (CSV)</h2>
        <p className={styles.note}>
          Files open in Excel and Google Sheets. Each download is recorded in the audit log.
        </p>

        <div className={styles.exports}>
          <form method="get" action="/admin/export/orders" className={styles.exportForm}>
            <h3>Orders</h3>
            <label className={styles.field}>
              Status
              <select name="status" defaultValue="">
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              From
              <input type="date" name="from" />
            </label>
            <label className={styles.field}>
              To
              <input type="date" name="to" />
            </label>
            <button type="submit">Download orders</button>
          </form>

          <form method="get" action="/admin/export/customers" className={styles.exportForm}>
            <h3>Customers</h3>
            <p className={styles.note}>All customers, with order counts and total value. No passwords.</p>
            <button type="submit">Download customers</button>
          </form>

          <form method="get" action="/admin/export/products" className={styles.exportForm}>
            <h3>Aggregated products</h3>
            <label className={styles.field}>
              Orders to include
              <select name="range" defaultValue="confirmed">
                {Object.entries(RANGES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Delivery date
              <input type="date" name="date" />
            </label>
            <label className={styles.field}>
              From
              <input type="date" name="from" />
            </label>
            <label className={styles.field}>
              To
              <input type="date" name="to" />
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="cancelled" value="1" />
              Include cancelled orders
            </label>
            <button type="submit">Download aggregated products</button>
          </form>

          <form method="get" action="/admin/export/deliveries" className={styles.exportForm}>
            <h3>Delivery list</h3>
            <label className={styles.field}>
              Which orders
              <select name="view" defaultValue="open">
                <option value="open">Open orders (confirmed to out for delivery)</option>
                <option value="today">Delivering today</option>
                <option value="all">All except cancelled</option>
              </select>
            </label>
            <button type="submit">Download delivery list</button>
          </form>
        </div>
      </section>
    </main>
  );
}
