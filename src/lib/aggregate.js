const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const RANGES = {
  confirmed: "All confirmed orders",
  preparing: "Preparing orders",
  ready: "Ready orders",
  today: "Today's orders",
  week: "This week's orders",
  delivery: "Selected delivery date",
  custom: "Custom date range",
};

export function isDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function offsetMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-]\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 0;
}

// The UTC instant at which the given London calendar day starts.
export function londonDayStart(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMinutes(new Date(guess)) * 60000;
  return new Date(guess - offsetMinutes(new Date(first)) * 60000);
}

export function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    new Date(),
  );
}

export function buildOrderWhere(filter = {}) {
  const range = RANGES[filter.range] ? filter.range : "confirmed";
  const where = {};

  if (range === "confirmed") where.status = "CONFIRMED";
  else if (range === "preparing") where.status = "PREPARING";
  else if (range === "ready") where.status = "READY";
  else if (range === "today") {
    const today = londonToday();
    where.createdAt = {
      gte: londonDayStart(today),
      lt: londonDayStart(addDays(today, 1)),
    };
  } else if (range === "week") {
    const today = londonToday();
    const [y, m, d] = today.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const monday = addDays(today, -((dayOfWeek + 6) % 7));
    where.createdAt = {
      gte: londonDayStart(monday),
      lt: londonDayStart(addDays(monday, 7)),
    };
  } else if (range === "delivery") {
    if (!isDate(filter.date)) return { error: "Choose a delivery date." };
    where.delivery = { deliveryDate: new Date(`${filter.date}T00:00:00.000Z`) };
  } else if (range === "custom") {
    if (!isDate(filter.from) || !isDate(filter.to)) {
      return { error: "Choose both a start date and an end date." };
    }
    if (filter.from > filter.to)
      return { error: "The start date must not be after the end date." };
    where.createdAt = {
      gte: londonDayStart(filter.from),
      lt: londonDayStart(addDays(filter.to, 1)),
    };
  }

  if (!filter.includeCancelled && !where.status)
    where.status = { not: "CANCELLED" };
  return { where, range };
}

function toHundredths(value) {
  return Math.round(Number(String(value)) * 100);
}

function fromHundredths(value) {
  return Number((value / 100).toFixed(2));
}

// items: [{ productId, productName, unit, quantity, orderId, orderNumber, userId, customerName }]
export function aggregateItems(items) {
  const products = new Map();

  for (const item of items) {
    const key = `${item.productId}|${item.unit}`;
    let product = products.get(key);
    if (!product) {
      product = {
        key,
        productId: item.productId,
        name: item.productName,
        unit: item.unit,
        hundredths: 0,
        customers: new Map(),
      };
      products.set(key, product);
    }

    const amount = toHundredths(item.quantity);
    product.hundredths += amount;

    let customer = product.customers.get(item.userId);
    if (!customer) {
      customer = {
        userId: item.userId,
        name: item.customerName,
        hundredths: 0,
        orders: [],
      };
      product.customers.set(item.userId, customer);
    }
    customer.hundredths += amount;
    customer.orders.push({ id: item.orderId, number: item.orderNumber });
  }

  return [...products.values()]
    .map((product) => ({
      key: product.key,
      productId: product.productId,
      name: product.name,
      unit: product.unit,
      total: fromHundredths(product.hundredths),
      customerCount: product.customers.size,
      customers: [...product.customers.values()]
        .map((customer) => ({
          userId: customer.userId,
          name: customer.name,
          quantity: fromHundredths(customer.hundredths),
          orders: customer.orders,
        }))
        .sort((a, b) => b.quantity - a.quantity),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAggregate(db, filter) {
  const built = buildOrderWhere(filter);
  if (built.error) return { error: built.error, rows: [], orderCount: 0 };

  const orders = await db.order.findMany({
    where: built.where,
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      fullName: true,
      orderItems: {
        select: {
          productId: true,
          productNameSnapshot: true,
          unit: true,
          quantity: true,
        },
      },
    },
  });

  const items = orders.flatMap((order) =>
    order.orderItems.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      unit: item.unit,
      quantity: item.quantity,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      customerName: order.fullName,
    })),
  );

  return {
    rows: aggregateItems(items),
    orderCount: orders.length,
    range: built.range,
  };
}
