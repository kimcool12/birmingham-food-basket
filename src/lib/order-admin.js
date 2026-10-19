import { STATUS_FLOW, STATUS_LABELS } from "./order-status.js";

const NOTIFICATION_TYPES = {
  CONFIRMED: "ORDER_CONFIRMED",
  PREPARING: "ORDER_PREPARING",
  READY: "ORDER_READY",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "CUSTOM",
};

function notificationMessage(orderNumber, status) {
  switch (status) {
    case "CONFIRMED":
      return `Your order #${orderNumber} has been confirmed.`;
    case "PREPARING":
      return `We are now preparing your order #${orderNumber}.`;
    case "READY":
      return `Your order #${orderNumber} is ready.`;
    case "OUT_FOR_DELIVERY":
      return `Your order #${orderNumber} is out for delivery.`;
    case "DELIVERED":
      return `Your order #${orderNumber} has been delivered. Thank you for shopping with us.`;
    case "CANCELLED":
      return `Your order #${orderNumber} has been cancelled.`;
    default:
      return `Your order #${orderNumber} was updated.`;
  }
}

export function canMove(from, to) {
  if (from === to) return false;
  if (from === "DELIVERED" || from === "CANCELLED") return false;
  if (to === "CANCELLED") return true;
  return STATUS_FLOW.indexOf(to) > STATUS_FLOW.indexOf(from);
}

export function allowedNext(from) {
  return [...STATUS_FLOW, "CANCELLED"].filter((to) => canMove(from, to));
}

export async function changeOrderStatus(db, adminId, orderId, newStatus) {
  if (![...STATUS_FLOW, "CANCELLED"].includes(newStatus)) {
    return { ok: false, message: "That is not a valid status." };
  }

  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, status: true, userId: true },
      });
      if (!order) return { ok: false, message: "Order not found." };

      if (!canMove(order.status, newStatus)) {
        return {
          ok: false,
          message: `Order #${order.orderNumber} cannot move from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[newStatus]}.`,
        };
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: newStatus, changedById: adminId },
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: NOTIFICATION_TYPES[newStatus],
          channel: "app",
          message: notificationMessage(order.orderNumber, newStatus),
        },
      });

      if (newStatus === "OUT_FOR_DELIVERY" || newStatus === "DELIVERED") {
        await tx.delivery.updateMany({
          where: { orderId: order.id },
          data: { status: newStatus },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: "ORDER_STATUS_CHANGED",
          target: "Order",
          targetId: order.id,
          oldValue: `Order #${order.orderNumber}: ${STATUS_LABELS[order.status]}`,
          newValue: `Order #${order.orderNumber}: ${STATUS_LABELS[newStatus]}`,
        },
      });

      return {
        ok: true,
        orderNumber: order.orderNumber,
        from: order.status,
        to: newStatus,
      };
    });
  } catch (error) {
    console.error("Change order status error:", error);
    return {
      ok: false,
      message: "Unable to change the status. Please try again.",
    };
  }
}
