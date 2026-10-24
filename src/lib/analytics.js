import { addDays } from './aggregate.js';

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' });
const labelFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

// The UK calendar day (YYYY-MM-DD) that a moment falls on.
export function ukDay(date) {
  return dayFormat.format(date);
}

function pence(value) {
  return Math.round(Number(String(value)) * 100);
}

function hundredths(value) {
  return Math.round(Number(String(value)) * 100);
}

export function summarise(orders) {
  const customers = new Set(orders.map((order) => order.userId));
  const valuePence = orders.reduce((sum, order) => sum + pence(order.total), 0);
  return {
    orders: orders.length,
    customers: customers.size,
    valuePence,
    averagePence: orders.length > 0 ? Math.round(valuePence / orders.length) : 0,
  };
}

// One point per day, with zero for days that had no orders.
export function dailySeries(orders, startDay, days) {
  const counts = new Map();
  for (const order of orders) {
    const day = ukDay(order.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDays(startDay, i);
    series.push({
      date: day,
      label: labelFormat.format(new Date(`${day}T12:00:00Z`)),
      orders: counts.get(day) ?? 0,
    });
  }
  return series;
}

// How many different orders each product appears in. This avoids mixing KG with boxes.
export function topProducts(items, limit = 10) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.productNameSnapshot}|${item.unit}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { name: item.productNameSnapshot, unit: item.unit, orderIds: new Set() };
      map.set(key, entry);
    }
    entry.orderIds.add(item.orderId);
  }
  return [...map.values()]
    .map((entry) => ({ name: entry.name, unit: entry.unit, orders: entry.orderIds.size }))
    .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Total quantity per product and unit. Units are never added together.
export function quantityTotals(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.productNameSnapshot}|${item.unit}`;
    const entry = map.get(key) ?? { name: item.productNameSnapshot, unit: item.unit, hundredths: 0 };
    entry.hundredths += hundredths(item.quantity);
    map.set(key, entry);
  }
  return [...map.values()]
    .map((entry) => ({
      name: entry.name,
      unit: entry.unit,
      total: Number((entry.hundredths / 100).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

// How many different orders include something from each category.
export function categoryOrders(items) {
  const map = new Map();
  for (const item of items) {
    const name = item.product?.category?.name ?? 'No category';
    let set = map.get(name);
    if (!set) {
      set = new Set();
      map.set(name, set);
    }
    set.add(item.orderId);
  }
  return [...map.entries()]
    .map(([name, set]) => ({ name, orders: set.size }))
    .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name));
}

// "B15 2TT" becomes "B15". Only the area is used, never the full postcode or address.
export function postcodeArea(postcode) {
  const compact = String(postcode ?? '')
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!compact) return 'Unknown';
  return compact.length >= 5 ? compact.slice(0, -3) : compact;
}

export function postcodeAreas(orders, limit = 15) {
  const map = new Map();
  for (const order of orders) {
    const area = postcodeArea(order.postcode);
    const entry = map.get(area) ?? { area, orders: 0, customers: new Set() };
    entry.orders += 1;
    entry.customers.add(order.userId);
    map.set(area, entry);
  }
  return [...map.values()]
    .map((entry) => ({ area: entry.area, orders: entry.orders, customers: entry.customers.size }))
    .sort((a, b) => b.orders - a.orders || a.area.localeCompare(b.area))
    .slice(0, limit);
}
