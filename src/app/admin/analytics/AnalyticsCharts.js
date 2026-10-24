'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import styles from './analytics.module.scss';

const GREEN = '#2f7d32';

function short(text, max = 26) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function DataTable({ columns, rows }) {
  return (
    <details className={styles.details}>
      <summary>Show these numbers as a table</summary>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Chart({ title, description, children, table }) {
  return (
    <figure className={styles.chart}>
      <figcaption>
        <h2>{title}</h2>
        <p>{description}</p>
      </figcaption>
      <div className={styles.plot}>{children}</div>
      {table}
    </figure>
  );
}

function HorizontalBars({ data, nameKey, valueKey, label }) {
  const height = Math.max(220, data.length * 34 + 40);
  const rows = data.map((d) => ({ ...d, shortName: short(String(d[nameKey])) }));
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="shortName" width={150} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey={valueKey} fill={GREEN} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsCharts({ daily, products, categories, postcodes }) {
  return (
    <div className={styles.charts}>
      <Chart
        title="Orders over time"
        description="Orders placed each day, not counting cancelled orders."
        table={
          <DataTable
            columns={['Date', 'Orders']}
            rows={daily.filter((d) => d.orders > 0).map((d) => [d.date, d.orders])}
          />
        }
      >
        <div style={{ height: 280 }} role="img" aria-label="Line chart of orders per day">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={daily} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} width={32} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="orders"
                stroke={GREEN}
                strokeWidth={2}
                dot={daily.length <= 31}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Chart>

      <Chart
        title="Most ordered products"
        description="How many different orders each product appears in."
        table={
          <DataTable
            columns={['Product', 'Unit', 'Orders']}
            rows={products.map((p) => [p.name, p.unit, p.orders])}
          />
        }
      >
        {products.length === 0 ? (
          <p className={styles.none}>No products ordered in this period.</p>
        ) : (
          <HorizontalBars
            data={products}
            nameKey="name"
            valueKey="orders"
            label="Bar chart of the most ordered products"
          />
        )}
      </Chart>

      <Chart
        title="Orders by category"
        description="How many different orders include something from each category."
        table={
          <DataTable columns={['Category', 'Orders']} rows={categories.map((c) => [c.name, c.orders])} />
        }
      >
        {categories.length === 0 ? (
          <p className={styles.none}>No orders in this period.</p>
        ) : (
          <HorizontalBars
            data={categories}
            nameKey="name"
            valueKey="orders"
            label="Bar chart of orders by category"
          />
        )}
      </Chart>

      <Chart
        title="Postcode areas"
        description="Orders by postcode area, such as B15. Full postcodes and addresses are not shown."
        table={
          <DataTable
            columns={['Area', 'Orders', 'Customers']}
            rows={postcodes.map((p) => [p.area, p.orders, p.customers])}
          />
        }
      >
        {postcodes.length === 0 ? (
          <p className={styles.none}>No orders in this period.</p>
        ) : (
          <HorizontalBars
            data={postcodes}
            nameKey="area"
            valueKey="orders"
            label="Bar chart of orders by postcode area"
          />
        )}
      </Chart>
    </div>
  );
}
