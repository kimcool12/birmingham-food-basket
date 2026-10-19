"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/permissions";
import { cancelOwnOrder } from "../../../../lib/order-admin";

export async function cancelOrder(prevState, formData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId") ?? "");
  const result = await cancelOwnOrder(prisma, user.id, orderId);

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/admin/orders");

  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: `Order #${result.orderNumber} has been cancelled.`,
  };
}
