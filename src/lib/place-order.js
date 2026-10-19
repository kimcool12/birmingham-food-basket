import { priceCart } from "./order-pricing.js";

class OrderRejected extends Error {
  constructor(itemErrors) {
    super("Order rejected");
    this.itemErrors = itemErrors;
  }
}

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;
const POSTCODE_RE = /^[A-Za-z0-9][A-Za-z0-9 ]{1,8}[A-Za-z0-9]$/;

function text(value) {
  return String(value ?? "").trim();
}

function validateDetails(input) {
  const values = {
    fullName: text(input?.fullName),
    phone: text(input?.phone),
    whatsapp: text(input?.whatsapp),
    address: text(input?.address),
    postcode: text(input?.postcode).toUpperCase(),
    notes: text(input?.notes),
  };

  const errors = {};
  if (values.fullName.length < 2 || values.fullName.length > 100) {
    errors.fullName = "Enter your full name.";
  }
  if (!PHONE_RE.test(values.phone))
    errors.phone = "Enter a valid phone number.";
  if (values.whatsapp && !PHONE_RE.test(values.whatsapp)) {
    errors.whatsapp = "Enter a valid WhatsApp number.";
  }
  if (values.address.length < 5 || values.address.length > 200) {
    errors.address = "Enter your delivery address.";
  }
  if (!POSTCODE_RE.test(values.postcode))
    errors.postcode = "Enter a valid postcode.";
  if (values.notes.length > 500)
    errors.notes = "Notes must be 500 characters or fewer.";
  return { values, errors };
}

function validateRequests(raw, errors) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 10) {
    errors.customRequests = "You can add up to 10 custom requests.";
    return [];
  }

  const requests = [];
  for (const entry of raw) {
    const itemName = text(entry?.itemName);
    const quantity = text(entry?.quantity);
    const note = text(entry?.note);
    if (!itemName && !quantity && !note) continue;

    if (itemName.length < 2 || itemName.length > 100) {
      errors.customRequests = "Each custom request needs an item name.";
      continue;
    }
    if (!quantity || quantity.length > 40) {
      errors.customRequests =
        "Each custom request needs a quantity, for example 20kg.";
      continue;
    }
    if (note.length > 300) {
      errors.customRequests =
        "Custom request notes must be 300 characters or fewer.";
      continue;
    }
    requests.push({ itemName, quantity, note: note || null });
  }
  return requests;
}

// Creates an order for userId. Only product ids and quantities from the browser are used;
// every name, price and total is read from the database inside the transaction.
export async function placeOrder(userId, input, db) {
  const { values, errors } = validateDetails(input);
  const requests = validateRequests(input?.customRequests, errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: "Please fix the errors below." };
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const priced = await priceCart(input?.items, tx);
      if (!priced.ok) throw new OrderRejected(priced.errors);

      const created = await tx.order.create({
        data: {
          userId,
          status: "ORDER_PLACED",
          total: priced.total,
          fullName: values.fullName,
          phone: values.phone,
          whatsapp: values.whatsapp || null,
          address: values.address,
          postcode: values.postcode,
          notes: values.notes || null,
        },
        select: { id: true, orderNumber: true, total: true },
      });

      await tx.orderItem.createMany({
        data: priced.lines.map((line) => ({
          orderId: created.id,
          productId: line.productId,
          productNameSnapshot: line.productName,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          total: line.lineTotal,
        })),
      });

      if (requests.length > 0) {
        await tx.customRequest.createMany({
          data: requests.map((r) => ({ orderId: created.id, userId, ...r })),
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: created.id,
          status: "ORDER_PLACED",
          changedById: userId,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          orderId: created.id,
          type: "ORDER_PLACED",
          channel: "app",
          message: `Your order #${created.orderNumber} has been placed. We will confirm it shortly.`,
        },
      });

      return created;
    });

    return {
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total.toString(),
      },
    };
  } catch (error) {
    if (error instanceof OrderRejected) {
      return {
        ok: false,
        itemErrors: error.itemErrors,
        message: "Some items in your cart need attention.",
      };
    }
    console.error("Place order error:", error);
    return {
      ok: false,
      message: "Unable to place your order. Please try again.",
    };
  }
}
