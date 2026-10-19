"use server";

import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/permissions";
import { priceCart } from "../../../lib/order-pricing";
import { placeOrder } from "../../../lib/place-order";

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map((item) => ({
    productId: item?.productId,
    quantity: item?.quantity,
  }));
}

export async function previewCart(items) {
  await requireUser();
  return priceCart(cleanItems(items), prisma);
}

export async function submitOrder(payload) {
  const user = await requireUser();
  const result = await placeOrder(
    user.id,
    { ...payload, items: cleanItems(payload?.items) },
    prisma,
  );

  if (result.ok) {
    // Remember the delivery details for next time. Failure here must not undo the order.
    try {
      const fullName = String(payload?.fullName ?? "").trim();
      const phone = String(payload?.phone ?? "").trim();
      const address = String(payload?.address ?? "").trim();
      const postcode = String(payload?.postcode ?? "")
        .trim()
        .toUpperCase();
      const whatsapp = String(payload?.whatsapp ?? "").trim();

      await prisma.customerProfile.upsert({
        where: { userId: user.id },
        update: { fullName, phone, address, postcode },
        create: { userId: user.id, fullName, phone, address, postcode },
      });
      if (whatsapp) {
        await prisma.user.update({
          where: { id: user.id },
          data: { whatsapp },
        });
      }
    } catch (error) {
      console.error("Saving delivery details failed:", error);
    }
  }
  return result;
}
