const MAX_LINES = 100;
const MAX_QTY = 999;

function toPence(value) {
  return Math.round(Number(String(value)) * 100);
}

function money(pence) {
  return (pence / 100).toFixed(2);
}

function cleanItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { errors: [{ message: "Your cart is empty." }] };
  }
  if (raw.length > MAX_LINES) {
    return {
      errors: [
        {
          message: `One order can have at most ${MAX_LINES} different products.`,
        },
      ],
    };
  }

  const merged = new Map();
  const errors = [];

  for (const entry of raw) {
    const productId =
      typeof entry?.productId === "string" ? entry.productId : "";
    const quantity = Math.round(Number(entry?.quantity) * 100) / 100;

    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QTY
    ) {
      errors.push({
        productId,
        message: "One of the quantities in your cart is not valid.",
      });
      continue;
    }
    const total =
      Math.round(((merged.get(productId) ?? 0) + quantity) * 100) / 100;
    if (total > MAX_QTY) {
      errors.push({
        productId,
        message: `The maximum quantity per product is ${MAX_QTY}.`,
      });
      continue;
    }
    merged.set(productId, total);
  }

  return { merged, errors };
}

// Takes [{ productId, quantity }] from the browser and returns server-calculated lines and total.
// Anything else the browser sends (price, total, name) is ignored.
export async function priceCart(rawItems, db) {
  const cleaned = cleanItems(rawItems);
  if (cleaned.errors.length > 0) return { ok: false, errors: cleaned.errors };

  const ids = [...cleaned.merged.keys()];
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    include: { category: { select: { isActive: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const errors = [];
  const lines = [];
  let totalPence = 0;

  for (const [productId, quantity] of cleaned.merged) {
    const product = byId.get(productId);

    if (!product) {
      errors.push({
        productId,
        message: "A product in your cart no longer exists.",
      });
      continue;
    }
    if (!product.isActive || !product.category.isActive) {
      errors.push({
        productId,
        name: product.name,
        message: `"${product.name}" is no longer sold.`,
      });
      continue;
    }
    if (product.availability === "UNAVAILABLE") {
      errors.push({
        productId,
        name: product.name,
        message: `"${product.name}" is currently unavailable.`,
      });
      continue;
    }

    const unitPence = toPence(product.price);
    if (!(unitPence > 0)) {
      errors.push({
        productId,
        name: product.name,
        message: `"${product.name}" has no price set yet.`,
      });
      continue;
    }

    const linePence = Math.round(unitPence * quantity);
    totalPence += linePence;
    lines.push({
      productId,
      productName: product.name,
      size: product.size,
      unit: product.unit,
      quantity: quantity.toFixed(2),
      unitPrice: money(unitPence),
      lineTotal: money(linePence),
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, lines, total: money(totalPence) };
}
