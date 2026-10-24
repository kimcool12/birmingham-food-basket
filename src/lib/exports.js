import { RANGES, getAggregate, isDate, addDays, londonDayStart, londonToday } from './aggregate.js';
import { STATUS_LABELS } from './order-status.js';

const MAX_ROWS = 10000;

const dateTimeParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function ukDateTime(date) {
  if (!date) return '';
  const p = Object.fromEntries(dateTimeParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function dateOnly(date) {
  return date ? date.toISOString().slice(0, 10) : '';
}

function money(value) {
  return Number(String(value)).toFixed(2);
}

function itemsText(items) {
  return items.map((i) => `${i.productNameSnapshot} ${Number(i.quantity)} ${i.unit}`).join('; ');
}

export async function ordersExport(db, params = {}) {
  const and = [];
  if (Object.keys(STATUS_LABELS).includes(params.status)) and.push({ status: params.status });
  if (isDate(params.from)) and.push({ createdAt: { gte: londonDayStart(params.from) } });
  if (isDate(params.to)) and.push({ createdAt: { lt: londonDayStart(addDays(params.to, 1)) } });

  const orders = await db.order.findMany({
    where: and.length > 0 ? { AND: and } : {},
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    include: {
      user: { select: { username: true, email: true } },
      orderItems: { orderBy: { createdAt: 'asc' } },
      customRequests: { orderBy: { createdAt: 'asc' } },
      delivery: true,
    },
  });

  const rows = [
    [
      'Order',
      'Placed (UK time)',
      'Status',
      'Customer',
      'Username',
      'Email',
      'Phone',
      'WhatsApp',
      'Address',
      'Postcode',
      'Products',
      'Total (GBP)',
      'Delivery date',
      'Delivery time',
      'Notes',
      'Custom requests',
    ],
    ...orders.map((o) => [
      o.orderNumber,
      ukDateTime(o.createdAt),
      STATUS_LABELS[o.status] ?? o.status,
      o.fullName,
      o.user.username,
      o.user.email,
      o.phone,
      o.whatsapp ?? '',
      o.address,
      o.postcode,
      itemsText(o.orderItems),
      money(o.total),
      dateOnly(o.delivery?.deliveryDate),
      o.delivery?.deliveryTime ?? '',
      o.notes ?? '',
      o.customRequests.map((r) => `${r.itemName} ${r.quantity}${r.note ? ` (${r.note})` : ''}`).join('; '),
    ]),
  ];
  return { filename: 'orders', rows };
}

export async function customersExport(db) {
  const [customers, stats] = await Promise.all([
    db.user.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      // Only these fields are read. The password hash is never selected.
      select: {
        id: true,
        username: true,
        email: true,
        whatsapp: true,
        createdAt: true,
        profile: { select: { fullName: true, phone: true, address: true, postcode: true } },
      },
    }),
    db.order.groupBy({
      by: ['userId'],
      where: { status: { not: 'CANCELLED' } },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    }),
  ]);
  const byUser = new Map(stats.map((s) => [s.userId, s]));

  const rows = [
    [
      'Username',
      'Name',
      'Email',
      'Phone',
      'WhatsApp',
      'Address',
      'Postcode',
      'Registered (UK time)',
      'Orders (not cancelled)',
      'Total value (GBP)',
      'Latest order (UK time)',
    ],
    ...customers.map((c) => {
      const s = byUser.get(c.id);
      return [
        c.username,
        c.profile?.fullName ?? '',
        c.email,
        c.profile?.phone ?? '',
        c.whatsapp ?? '',
        c.profile?.address ?? '',
        c.profile?.postcode ?? '',
        ukDateTime(c.createdAt),
        s?._count._all ?? 0,
        money(s?._sum.total ?? 0),
        ukDateTime(s?._max.createdAt),
      ];
    }),
  ];
  return { filename: 'customers', rows };
}

export async function productsExport(db, params = {}) {
  const range = RANGES[params.range] ? params.range : 'confirmed';
  const result = await getAggregate(db, {
    range,
    date: params.date,
    from: params.from,
    to: params.to,
    includeCancelled: params.cancelled === '1',
  });
  if (result.error) return { error: result.error };

  const rows = [
    ['Product', 'Unit', 'Total required', 'Customers', 'Breakdown by customer'],
    ...result.rows.map((row) => [
      row.name,
      row.unit,
      row.total,
      row.customerCount,
      row.customers.map((c) => `${c.name}: ${c.quantity} ${row.unit}`).join('; '),
    ]),
  ];
  return { filename: `aggregated-products-${range}`, rows };
}

export async function deliveriesExport(db, params = {}) {
  const view = ['open', 'today', 'all'].includes(params.view) ? params.view : 'open';
  let where;
  if (view === 'today') {
    where = {
      status: { not: 'CANCELLED' },
      delivery: { is: { deliveryDate: new Date(`${londonToday()}T00:00:00.000Z`) } },
    };
  } else if (view === 'all') {
    where = { status: { not: 'CANCELLED' } };
  } else {
    where = { status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } };
  }

  const orders = await db.order.findMany({
    where,
    orderBy: [{ delivery: { deliveryDate: 'asc' } }, { createdAt: 'asc' }],
    take: MAX_ROWS,
    include: { orderItems: { orderBy: { createdAt: 'asc' } }, delivery: true },
  });

  const rows = [
    [
      'Customer',
      'Phone',
      'WhatsApp',
      'Address',
      'Postcode',
      'Order',
      'Products',
      'Quantity',
      'Delivery date',
      'Delivery time',
      'Status',
      'Notes',
    ],
    ...orders.map((o) => [
      o.fullName,
      o.phone,
      o.whatsapp ?? '',
      o.address,
      o.postcode,
      o.orderNumber,
      o.orderItems.map((i) => i.productNameSnapshot).join('; '),
      o.orderItems.map((i) => `${Number(i.quantity)} ${i.unit}`).join('; '),
      dateOnly(o.delivery?.deliveryDate),
      o.delivery?.deliveryTime ?? '',
      STATUS_LABELS[o.status] ?? o.status,
      o.notes ?? '',
    ]),
  ];
  return { filename: `delivery-list-${view}`, rows };
}
