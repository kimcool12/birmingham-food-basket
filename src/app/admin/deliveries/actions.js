"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import { changeOrderStatus } from "../../../lib/order-admin";
import { scheduleDelivery, notifyCustomer } from "../../../lib/delivery-admin";
import { STATUS_LABELS } from "../../../lib/order-status";

const BASE = "/admin/deliveries";

function safeReturn(formData) {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith(BASE) ? value : BASE;
}

function go(returnTo, key, message) {
  const sep = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${sep}${key}=${encodeURIComponent(message)}`);
}

function refresh(orderId) {
  revalidatePath(BASE);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function saveSchedule(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await scheduleDelivery(prisma, admin.id, orderId, {
    date: formData.get("date"),
    time: formData.get("time"),
  });
  refresh(orderId);

  if (!result.ok) go(returnTo, "error", result.message);
  go(returnTo, "notice", `Delivery saved for order #${result.orderNumber}.`);
}

export async function markStatus(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["OUT_FOR_DELIVERY", "DELIVERED"].includes(status)) {
    go(returnTo, "error", "That action is not allowed here.");
  }

  const result = await changeOrderStatus(prisma, admin.id, orderId, status);
  refresh(orderId);

  if (!result.ok) go(returnTo, "error", result.message);
  go(
    returnTo,
    "notice",
    `Order #${result.orderNumber} is now ${STATUS_LABELS[result.to]}.`,
  );
}

export async function sendNotice(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const orderId = String(formData.get("orderId") ?? "");
  const kind = String(formData.get("kind") ?? "");

  if (!["approaching", "scheduled", "call"].includes(kind)) {
    go(returnTo, "error", "Choose a message.");
  }

  const result = await notifyCustomer(prisma, admin.id, orderId, {
    kind,
    message: "",
  });
  refresh(orderId);

  if (!result.ok) go(returnTo, "error", result.message);
  go(
    returnTo,
    "notice",
    result.externalSent
      ? `Notification created in the app and sent for order #${result.orderNumber}.`
      : `Notification created in the app for order #${result.orderNumber}. No WhatsApp, SMS or email was sent, because none is connected yet.`,
  );
}
