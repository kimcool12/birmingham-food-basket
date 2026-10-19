export const STATUS_LABELS = {
  ORDER_PLACED: "Order Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_FLOW = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const MARKS = { DELIVERED: "✓", CANCELLED: "✕" };

export function statusMark(status) {
  return MARKS[status] ?? "●";
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});
const dateOnly = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});

export function formatDateTime(value) {
  return value ? dateTime.format(new Date(value)) : "";
}

export function formatDate(value) {
  return value ? dateOnly.format(new Date(value)) : "";
}

export function money(value) {
  return `£${Number(value).toFixed(2)}`;
}
