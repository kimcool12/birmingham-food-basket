import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";
import { priceCart } from "../src/lib/order-pricing.js";

const { PrismaClient } = generated;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function show(title, result) {
  console.log(`\n${title}`);
  if (result.ok) {
    for (const l of result.lines) {
      console.log(
        `  ${l.productName}: ${l.quantity} x £${l.unitPrice} = £${l.lineTotal}`,
      );
    }
    console.log(`  TOTAL: £${result.total}`);
  } else {
    for (const e of result.errors) console.log(`  REJECTED: ${e.message}`);
  }
}

async function main() {
  const beef = await prisma.product.findFirst({
    where: { name: "Beef (Shin)" },
  });
  const tomatoes = await prisma.product.findFirst({
    where: { name: "Box of Tomatoes" },
  });
  const off = await prisma.product.findFirst({
    where: { availability: "UNAVAILABLE", isActive: true },
  });
  if (!beef || !tomatoes || !off)
    throw new Error("Test products not found in the database.");

  show(
    "1. Valid order: 30 KG beef + 2 boxes tomatoes (expect £324.00)",
    await priceCart(
      [
        { productId: beef.id, quantity: 30 },
        { productId: tomatoes.id, quantity: 2 },
      ],
      prisma,
    ),
  );
  show(
    "2. Browser sends a fake price of 0.01 (expect the real £10.00 price, total £300.00)",
    await priceCart(
      [{ productId: beef.id, quantity: 30, price: 0.01, total: 0.3 }],
      prisma,
    ),
  );
  show(
    "3. Same product twice, 10 + 20 (expect one line, 30 KG, £300.00)",
    await priceCart(
      [
        { productId: beef.id, quantity: 10 },
        { productId: beef.id, quantity: 20 },
      ],
      prisma,
    ),
  );
  show(
    `4. Unavailable product "${off.name}" (expect rejected)`,
    await priceCart([{ productId: off.id, quantity: 1 }], prisma),
  );
  show(
    "5. Product that does not exist (expect rejected)",
    await priceCart([{ productId: "not-a-real-id", quantity: 1 }], prisma),
  );
  show(
    "6. Quantity 0 (expect rejected)",
    await priceCart([{ productId: beef.id, quantity: 0 }], prisma),
  );
  show(
    "7. Negative quantity (expect rejected)",
    await priceCart([{ productId: beef.id, quantity: -5 }], prisma),
  );
  show(
    '8. Quantity "abc" (expect rejected)',
    await priceCart([{ productId: beef.id, quantity: "abc" }], prisma),
  );
  show("9. Empty cart (expect rejected)", await priceCart([], prisma));
}

main()
  .catch((error) => {
    console.error("Check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
