import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";
import { placeOrder } from "../src/lib/place-order.js";
import { changeOrderStatus, cancelOwnOrder } from "../src/lib/order-admin.js";

const { PrismaClient } = generated;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const details = {
  fullName: "Status Test",
  phone: "+447000000000",
  address: "1 Test Street, Birmingham",
  postcode: "B1 1AA",
};

async function makeOrder(userId, productId) {
  const r = await placeOrder(
    userId,
    { ...details, items: [{ productId, quantity: 1 }] },
    prisma,
  );
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.order;
}

async function admin(adminId, orderId, to) {
  const r = await changeOrderStatus(prisma, adminId, orderId, to);
  console.log(`  admin -> ${to}: ${r.ok ? "OK" : "REJECTED - " + r.message}`);
  return r;
}

async function customer(userId, orderId, label) {
  const r = await cancelOwnOrder(prisma, userId, orderId);
  console.log(
    `  customer cancel (${label}): ${r.ok ? "OK" : "REJECTED - " + r.message}`,
  );
  return r;
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "test1@example.com" },
  });
  const other = await prisma.user.findFirst({
    where: { role: "CUSTOMER", id: { not: user?.id } },
  });
  const adm = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const product = await prisma.product.findFirst({
    where: { availability: "AVAILABLE", isActive: true },
  });
  if (!user || !adm || !product) throw new Error("Test data not found.");

  const made = [];
  try {
    console.log("\n1. Admin can move in any direction (expect every move OK)");
    const a = await makeOrder(user.id, product.id);
    made.push(a.id);
    for (const s of [
      "CONFIRMED",
      "PREPARING",
      "DELIVERED",
      "READY",
      "CANCELLED",
      "CONFIRMED",
    ]) {
      await admin(adm.id, a.id, s);
    }
    const notes = await prisma.notification.findMany({
      where: { orderId: a.id },
      orderBy: { createdAt: "asc" },
    });
    console.log(
      "  last message:",
      notes[notes.length - 1].message,
      '(expect "status was updated to Confirmed")',
    );

    console.log("\n2. Same status and bad status (expect both REJECTED)");
    await admin(adm.id, a.id, "CONFIRMED");
    await admin(adm.id, a.id, "NONSENSE");

    console.log(
      "\n3. Customer cancels while Order Placed (expect OK, then REJECTED the second time)",
    );
    const b = await makeOrder(user.id, product.id);
    made.push(b.id);
    await customer(user.id, b.id, "order placed");
    await customer(user.id, b.id, "again");
    const hist = await prisma.orderStatusHistory.findMany({
      where: { orderId: b.id },
      orderBy: { createdAt: "asc" },
    });
    console.log(
      "  history:",
      hist.map((h) => h.status).join(" > "),
      "(expect ORDER_PLACED > CANCELLED)",
    );

    console.log("\n4. Customer cancels while Confirmed (expect OK)");
    const c = await makeOrder(user.id, product.id);
    made.push(c.id);
    await admin(adm.id, c.id, "CONFIRMED");
    await customer(user.id, c.id, "confirmed");

    console.log(
      "\n5. Customer cannot cancel once Preparing or Delivered (expect both REJECTED)",
    );
    const d = await makeOrder(user.id, product.id);
    made.push(d.id);
    await admin(adm.id, d.id, "PREPARING");
    await customer(user.id, d.id, "preparing");
    await admin(adm.id, d.id, "DELIVERED");
    await customer(user.id, d.id, "delivered");

    console.log(
      "\n6. Another customer cannot cancel this order (expect REJECTED - Order not found)",
    );
    if (other) {
      const e = await makeOrder(user.id, product.id);
      made.push(e.id);
      await customer(other.id, e.id, "wrong customer");
      const still = await prisma.order.findUnique({ where: { id: e.id } });
      console.log(
        "  order status afterwards:",
        still.status,
        "(expect ORDER_PLACED)",
      );
    } else {
      console.log("  skipped: no second customer account in the database");
    }
  } finally {
    for (const id of made) {
      await prisma.adminAuditLog.deleteMany({ where: { targetId: id } });
      await prisma.order.delete({ where: { id } });
    }
    console.log(`\nTest orders deleted: ${made.length}`);
  }
}

main()
  .catch((error) => {
    console.error("Check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
