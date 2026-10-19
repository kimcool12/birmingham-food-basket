import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";
import { placeOrder } from "../src/lib/place-order.js";

const { PrismaClient } = generated;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const details = {
  fullName: "Test Customer",
  phone: "+447000000000",
  whatsapp: "+447000000000",
  address: "1 Test Street, Birmingham",
  postcode: "b1 1aa",
  notes: "Please call before delivery.",
};

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "test1@example.com" },
  });
  const beef = await prisma.product.findFirst({
    where: { name: "Beef (Shin)" },
  });
  const tomatoes = await prisma.product.findFirst({
    where: { name: "Box of Tomatoes" },
  });
  const off = await prisma.product.findFirst({
    where: { availability: "UNAVAILABLE", isActive: true },
  });
  if (!user || !beef || !tomatoes || !off)
    throw new Error("Test data not found.");

  const before = await prisma.order.count();

  console.log(
    "\n1. Place a valid order (browser also sends a fake price of 0.01)",
  );
  const good = await placeOrder(
    user.id,
    {
      ...details,
      items: [
        { productId: beef.id, quantity: 30, price: 0.01, total: 0.01 },
        { productId: tomatoes.id, quantity: 2 },
      ],
      customRequests: [
        {
          itemName: "Nigerian Honey Beans",
          quantity: "20kg",
          note: "Please source a good quality batch.",
        },
      ],
    },
    prisma,
  );
  console.log("  result ok:", good.ok);
  if (!good.ok) throw new Error(JSON.stringify(good));
  const id = good.order.id;
  console.log(
    `  Order #${good.order.orderNumber}, total £${good.order.total} (expect £324.00)`,
  );

  try {
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    for (const i of items) {
      console.log(
        `  item: ${i.productNameSnapshot} ${i.quantity} ${i.unit} x £${i.unitPrice} = £${i.total}`,
      );
    }
    console.log(
      "  history rows:",
      await prisma.orderStatusHistory.count({ where: { orderId: id } }),
      "| notifications:",
      await prisma.notification.count({
        where: { orderId: id, type: "ORDER_PLACED" },
      }),
      "| custom requests:",
      await prisma.customRequest.count({ where: { orderId: id } }),
      "(expect 1, 1, 1)",
    );

    console.log(
      "\n2. Change the Beef price to £11.00 and read the OLD order again",
    );
    await prisma.product.update({
      where: { id: beef.id },
      data: { price: "11.00" },
    });
    try {
      const old = await prisma.orderItem.findFirst({
        where: { orderId: id, productId: beef.id },
      });
      console.log(
        `  old order still shows £${old.unitPrice} per ${old.unit} (expect £10.00)`,
      );
    } finally {
      await prisma.product.update({
        where: { id: beef.id },
        data: { price: beef.price },
      });
      console.log("  Beef price restored to", beef.price.toString());
    }
  } finally {
    await prisma.order.delete({ where: { id } });
    console.log("\n  Test order deleted.");
  }

  console.log("\n3. Unavailable product (expect rejected, no order saved)");
  const bad = await placeOrder(
    user.id,
    { ...details, items: [{ productId: off.id, quantity: 1 }] },
    prisma,
  );
  console.log("  ok:", bad.ok, "|", bad.itemErrors?.[0]?.message);

  console.log(
    "\n4. Bad customer details (expect field errors, no order saved)",
  );
  const badDetails = await placeOrder(
    user.id,
    {
      ...details,
      fullName: "",
      phone: "abc",
      items: [{ productId: beef.id, quantity: 1 }],
    },
    prisma,
  );
  console.log(
    "  ok:",
    badDetails.ok,
    "| fields:",
    Object.keys(badDetails.errors ?? {}).join(", "),
  );

  const after = await prisma.order.count();
  console.log(
    `\nOrders in database: before ${before}, after ${after} (expect the same)`,
  );
}

main()
  .catch((error) => {
    console.error("Check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
