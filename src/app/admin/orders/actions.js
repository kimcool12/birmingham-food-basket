"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import { changeOrderStatus } from "../../../lib/order-admin";
import { STATUS_LABELS } from "../../../lib/order-status";

const BASE = "/admin/orders";

function safeReturn(formData) {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith(BASE) ? value : BASE;
}

function go(returnTo, key, message) {
  const sep = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${sep}${key}=${encodeURIComponent(message)}`);
}

export async function updateOrderStatus(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");

  const result = await changeOrderStatus(prisma, admin.id, orderId, status);
  revalidatePath(BASE);
  revalidatePath("/orders");

  if (!result.ok) go(returnTo, "error", result.message);
  go(
    returnTo,
    "notice",
    `Order #${result.orderNumber} is now ${STATUS_LABELS[result.to]}.`,
  );
}
