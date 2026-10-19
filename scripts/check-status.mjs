import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";
import { placeOrder } from "../src/lib/place-order.js";
import { changeOrderStatus } from "../src/lib/order-admin.js";

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
  const result = await placeOrder(
    userId,
    { ...details, items: [{ productId, quantity: 1 }] },
    prisma,
  );
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.order;
}

async function step(adminId, orderId, to) {
  const r = await changeOrderStatus(prisma, adminId, orderId, to);
  console.log(`  -> ${to}: ${r.ok ? "OK" : "REJECTED - " + r.message}`);
  return r;
}

async function main() {
  const customer = await prisma.user.findUnique({
    where: { email: "test1@example.com" },
  });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const product = await prisma.product.findFirst({
    where: { availability: "AVAILABLE", isActive: true },
  });
  if (!customer || !admin || !product) throw new Error("Test data not found.");

  const made = [];
  try {
    console.log("\n1. Full flow on order A (expect every step OK)");
    const a = await makeOrder(customer.id, product.id);
    made.push(a.id);
    for (const s of [
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ]) {
      await step(admin.id, a.id, s);
    }

    console.log("\n2. What was recorded for order A");
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: a.id },
      orderBy: { createdAt: "asc" },
    });
    console.log("  history:", history.map((h) => h.status).join(" > "));
    const notes = await prisma.notification.findMany({
      where: { orderId: a.id },
      orderBy: { createdAt: "asc" },
    });
    console.log(
      "  notifications:",
      notes.length,
      "(expect 6: placed + 5 changes)",
    );
    console.log("  last message:", notes[notes.length - 1].message);
    const audits = await prisma.adminAuditLog.count({
      where: { targetId: a.id, action: "ORDER_STATUS_CHANGED" },
    });
    console.log("  audit rows:", audits, "(expect 5)");

    console.log("\n3. Delivered orders are final (expect both REJECTED)");
    await step(admin.id, a.id, "PREPARING");
    await step(admin.id, a.id, "CANCELLED");

    console.log("\n4. Order B: skip ahead, then try to go backwards");
    const b = await makeOrder(customer.id, product.id);
    made.push(b.id);
    await step(admin.id, b.id, "READY");
    await step(admin.id, b.id, "CONFIRMED");

    console.log("\n5. Order C: cancel it, then try to reopen it");
    const c = await makeOrder(customer.id, product.id);
    made.push(c.id);
    await step(admin.id, c.id, "CANCELLED");
    await step(admin.id, c.id, "CONFIRMED");

    console.log("\n6. Same status twice, and a bad status");
    const d = await makeOrder(customer.id, product.id);
    made.push(d.id);
    await step(admin.id, d.id, "ORDER_PLACED");
    await step(admin.id, d.id, "NONSENSE");
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
