import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import { RANGES, getAggregate } from "../../../lib/aggregate";
import styles from "./aggregator.module.scss";

export const metadata = { title: "Aggregator | Admin" };

export default async function AggregatorPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const range = RANGES[sp.range] ? sp.range : "confirmed";
  const filter = {
    range,
    date: String(sp.date ?? ""),
    from: String(sp.from ?? ""),
    to: String(sp.to ?? ""),
    includeCancelled: sp.cancelled === "1",
  };

  const result = await getAggregate(prisma, filter);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Order Aggregator</h1>

      <form method="get" className={styles.filters} role="search">
        <label className={styles.field}>
          Orders to include
          <select name="range" defaultValue={range}>
            {Object.entries(RANGES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Delivery date (for &quot;Selected delivery date&quot;)
          <input type="date" name="date" defaultValue={filter.date} />
        </label>
        <label className={styles.field}>
          From (for &quot;Custom date range&quot;)
          <input type="date" name="from" defaultValue={filter.from} />
        </label>
        <label className={styles.field}>
          To
          <input type="date" name="to" defaultValue={filter.to} />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            name="cancelled"
            value="1"
            defaultChecked={filter.includeCancelled}
          />
          Include cancelled orders
        </label>
        <button type="submit">Show</button>
        <Link href="/admin/aggregator" className={styles.btn}>
          Reset
        </Link>
      </form>

      {result.error && (
        <p className={styles.error} role="alert">
          {result.error}
        </p>
      )}

      {!result.error && (
        <p className={styles.summary} role="status">
          {RANGES[range]}: {result.orderCount} order
          {result.orderCount === 1 ? "" : "s"}, {result.rows.length} product
          {result.rows.length === 1 ? "" : "s"}
          {filter.includeCancelled ? " (cancelled orders included)" : ""}
        </p>
      )}

      {!result.error && result.rows.length === 0 && (
        <p className={styles.empty}>No orders match this selection.</p>
      )}

      {result.rows.length > 0 && (
        <>
          <div className={styles.head} aria-hidden="true">
            <span>Product</span>
            <span>Total required</span>
            <span>Customers</span>
          </div>
          <ul className={styles.list}>
            {result.rows.map((row) => (
              <li key={row.key}>
                <details className={styles.row}>
                  <summary>
                    <span className={styles.name}>{row.name}</span>
                    <span className={styles.total}>
                      {row.total} {row.unit}
                    </span>
                    <span className={styles.count}>
                      {row.customerCount} customer
                      {row.customerCount === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <ul className={styles.detail}>
                    {row.customers.map((customer) => (
                      <li key={customer.userId} className={styles.who}>
                        <span>
                          {customer.name}
                          <br />
                          {customer.orders.map((order) => (
                            <Link
                              key={order.id}
                              href={`/admin/orders/${order.id}`}
                            >
                              #{order.number}
                            </Link>
                          ))}
                        </span>
                        <strong>
                          {customer.quantity} {row.unit}
                        </strong>
                      </li>
                    ))}
                    <li className={styles.sum}>
                      <span>TOTAL</span>
                      <span>
                        {row.total} {row.unit}
                      </span>
                    </li>
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
