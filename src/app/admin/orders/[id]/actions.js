"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/permissions";
import {
  scheduleDelivery,
  notifyCustomer,
} from "../../../../lib/delivery-admin";

function backTo(formData) {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith("/admin/orders/") ? value : "/admin/orders";
}

function go(returnTo, key, message) {
  redirect(`${returnTo}?${key}=${encodeURIComponent(message)}`);
}

export async function saveDelivery(formData) {
  const admin = await requireAdmin();
  const returnTo = backTo(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await scheduleDelivery(prisma, admin.id, orderId, {
    date: formData.get("date"),
    time: formData.get("time"),
  });
  revalidatePath(returnTo);
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);

  if (!result.ok) go(returnTo, "error", result.message);
  go(returnTo, "notice", `Delivery saved for order #${result.orderNumber}.`);
}

export async function sendNotification(formData) {
  const admin = await requireAdmin();
  const returnTo = backTo(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await notifyCustomer(prisma, admin.id, orderId, {
    kind: formData.get("kind"),
    message: formData.get("message"),
  });
  revalidatePath(returnTo);

  if (!result.ok) go(returnTo, "error", result.message);
  go(
    returnTo,
    "notice",
    result.externalSent
      ? `Notification created in the app and sent for order #${result.orderNumber}.`
      : `Notification created in the app for order #${result.orderNumber}. No WhatsApp, SMS or email was sent, because none is connected yet.`,
  );
}
