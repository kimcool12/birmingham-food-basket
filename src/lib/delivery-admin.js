import { formatDate } from "./order-status.js";
import { sendExternal } from "./notify-provider.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value) {
  if (!DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function presetMessage(kind, order, delivery) {
  const n = order.orderNumber;
  if (kind === "approaching") {
    return `Your Birmingham Food Basket order #${n} is about to be delivered. Please make sure someone is available to receive it.`;
  }
  if (kind === "call") {
    return `We will call you before delivering your order #${n}.`;
  }
  if (kind === "scheduled") {
    if (!delivery?.deliveryDate) return null;
    const when = formatDate(delivery.deliveryDate);
    const time = delivery.deliveryTime ? ` (${delivery.deliveryTime})` : "";
    return `Your order #${n} is scheduled for delivery on ${when}${time}.`;
  }
  return "";
}

export async function scheduleDelivery(db, adminId, orderId, input) {
  const dateText = String(input?.date ?? "").trim();
  const time = String(input?.time ?? "").trim();

  const date = parseDate(dateText);
  if (!date) return { ok: false, message: "Enter a valid delivery date." };
  if (time.length > 40)
    return {
      ok: false,
      message: "The time window must be 40 characters or fewer.",
    };

  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, status: true },
      });
      if (!order) return { ok: false, message: "Order not found." };
      if (order.status === "CANCELLED") {
        return {
          ok: false,
          message: `Order #${order.orderNumber} is cancelled, so it cannot be scheduled.`,
        };
      }

      const existing = await tx.delivery.findUnique({
        where: { orderId: order.id },
      });
      const status =
        order.status === "DELIVERED" || order.status === "OUT_FOR_DELIVERY"
          ? order.status
          : "SCHEDULED";

      await tx.delivery.upsert({
        where: { orderId: order.id },
        update: { deliveryDate: date, deliveryTime: time || null },
        create: {
          orderId: order.id,
          deliveryDate: date,
          deliveryTime: time || null,
          status,
        },
      });

      const before = existing?.deliveryDate
        ? `${existing.deliveryDate.toISOString().slice(0, 10)} ${existing.deliveryTime ?? ""}`.trim()
        : "not scheduled";
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: "DELIVERY_SCHEDULED",
          target: "Order",
          targetId: order.id,
          oldValue: `Order #${order.orderNumber}: ${before}`,
          newValue: `Order #${order.orderNumber}: ${`${dateText} ${time}`.trim()}`,
        },
      });

      return { ok: true, orderNumber: order.orderNumber };
    });
  } catch (error) {
    console.error("Schedule delivery error:", error);
    return {
      ok: false,
      message: "Unable to save the delivery. Please try again.",
    };
  }
}

export async function notifyCustomer(db, adminId, orderId, input) {
  const kind = String(input?.kind ?? "");
  if (!["approaching", "scheduled", "call", "custom"].includes(kind)) {
    return { ok: false, message: "Choose a message." };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });
    if (!order) return { ok: false, message: "Order not found." };

    let message;
    if (kind === "custom") {
      message = String(input?.message ?? "").trim();
      if (message.length < 3 || message.length > 500) {
        return {
          ok: false,
          message: "A custom message must be 3 to 500 characters.",
        };
      }
    } else {
      message = presetMessage(kind, order, order.delivery);
      if (!message)
        return { ok: false, message: "Schedule a delivery date first." };
    }

    // Nothing is sent outside the app unless a real provider is configured.
    const external = await sendExternal({
      phone: order.phone,
      whatsapp: order.whatsapp,
      message,
    });

    await db.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: kind === "approaching" ? "DELIVERY_APPROACHING" : "CUSTOM",
          channel: "app",
          externalSent: Boolean(external?.sent),
          message,
        },
      });

      if ((kind === "approaching" || kind === "scheduled") && order.delivery) {
        await tx.delivery.update({
          where: { orderId: order.id },
          data: { notificationSent: true },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: "CUSTOMER_NOTIFIED",
          target: "Order",
          targetId: order.id,
          oldValue: null,
          newValue: `Order #${order.orderNumber}: ${message}`,
        },
      });
    });

    return {
      ok: true,
      orderNumber: order.orderNumber,
      externalSent: Boolean(external?.sent),
    };
  } catch (error) {
    console.error("Notify customer error:", error);
    return {
      ok: false,
      message: "Unable to send the notification. Please try again.",
    };
  }
}
