import { STATUS_FLOW, STATUS_LABELS } from "./order-status.js";

const ALL = [...STATUS_FLOW, "CANCELLED"];

// Customers can cancel their own order only in these statuses.
export const CUSTOMER_CANCELLABLE = ["ORDER_PLACED", "CONFIRMED"];

const NOTIFICATION_TYPES = {
  CONFIRMED: "ORDER_CONFIRMED",
  PREPARING: "ORDER_PREPARING",
  READY: "ORDER_READY",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "CUSTOM",
};

function forwardMessage(orderNumber, status) {
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

function correctionMessage(orderNumber, status) {
  return `Your order #${orderNumber} status was updated to ${STATUS_LABELS[status]}.`;
}

function isForward(from, to) {
  if (to === "CANCELLED") return true;
  if (from === "DELIVERED" || from === "CANCELLED") return false;
  return STATUS_FLOW.indexOf(to) > STATUS_FLOW.indexOf(from);
}

// Admins can move an order to any other status.
export function canMove(from, to) {
  return ALL.includes(to) && from !== to;
}

export function allowedNext(from) {
  return ALL.filter((to) => canMove(from, to));
}

export function canCustomerCancel(status) {
  return CUSTOMER_CANCELLABLE.includes(status);
}

export async function changeOrderStatus(db, adminId, orderId, newStatus) {
  if (!ALL.includes(newStatus)) {
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
          message: `Order #${order.orderNumber} is already ${STATUS_LABELS[order.status]}.`,
        };
      }

      const forward = isForward(order.status, newStatus);

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
          type: forward ? NOTIFICATION_TYPES[newStatus] : "CUSTOM",
          channel: "app",
          message: forward
            ? forwardMessage(order.orderNumber, newStatus)
            : correctionMessage(order.orderNumber, newStatus),
        },
      });

      if (newStatus === "OUT_FOR_DELIVERY" || newStatus === "DELIVERED") {
        await tx.delivery.updateMany({
          where: { orderId: order.id },
          data: { status: newStatus },
        });
      } else {
        await tx.delivery.updateMany({
          where: {
            orderId: order.id,
            status: { in: ["OUT_FOR_DELIVERY", "DELIVERED"] },
          },
          data: { status: "SCHEDULED" },
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

// A customer cancelling their own order. The user id is part of the lookup, and the status
// check is part of the update, so it cannot cancel someone else's order or a later-stage order.
export async function cancelOwnOrder(db, userId, orderId) {
  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true, orderNumber: true, status: true },
      });
      if (!order) return { ok: false, message: "Order not found." };

      if (order.status === "CANCELLED") {
        return {
          ok: false,
          message: `Order #${order.orderNumber} is already cancelled.`,
        };
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, userId, status: { in: CUSTOMER_CANCELLABLE } },
        data: { status: "CANCELLED" },
      });
      if (updated.count === 0) {
        return {
          ok: false,
          message: `Order #${order.orderNumber} can no longer be cancelled online because it is already ${STATUS_LABELS[order.status]}. Please contact us.`,
        };
      }

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "CANCELLED", changedById: userId },
      });
      await tx.notification.create({
        data: {
          userId,
          orderId: order.id,
          type: "CUSTOM",
          channel: "app",
          message: `You cancelled your order #${order.orderNumber}.`,
        },
      });
      await tx.delivery.updateMany({
        where: { orderId: order.id },
        data: { status: "SCHEDULED" },
      });

      return { ok: true, orderNumber: order.orderNumber };
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return {
      ok: false,
      message: "Unable to cancel the order. Please try again.",
    };
  }
}
