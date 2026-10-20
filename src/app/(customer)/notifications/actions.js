"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/permissions";

export async function markRead(formData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  // The user id is part of the filter, so nobody can mark another customer's notification.
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
