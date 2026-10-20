import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";
import { placeOrder } from "../src/lib/place-order.js";
import { changeOrderStatus } from "../src/lib/order-admin.js";
import {
  aggregateItems,
  getAggregate,
  londonDayStart,
} from "../src/lib/aggregate.js";

const { PrismaClient } = generated;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(label, ok, detail = "") {
  console.log(
    `  ${ok ? "PASS" : "FAIL"} - ${label}${detail ? ` (${detail})` : ""}`,
  );
  if (!ok) failures += 1;
}

function item(userId, name, quantity, extra = {}) {
  return {
    productId: "beef",
    productName: "Beef (Shin)",
    unit: "KG",
    quantity,
    orderId: `order-${userId}-${quantity}`,
    orderNumber: 1,
    userId,
    customerName: name,
    ...extra,
  };
}

function runPureChecks() {
  console.log("\n1. Beef: Customer A 30, Customer B 20, Customer C 15");
  const rows = aggregateItems([
    item("a", "Customer A", "30.00"),
    item("b", "Customer B", "20.00"),
    item("c", "Customer C", "15.00"),
  ]);
  check("one product line", rows.length === 1);
  check("total is 65", rows[0].total === 65, String(rows[0].total));
  check("3 customers", rows[0].customerCount === 3);
  check(
    "customers listed as 30, 20, 15",
    rows[0].customers.map((c) => c.quantity).join(",") === "30,20,15",
  );

  console.log("\n2. Decimals add up exactly");
  const decimals = aggregateItems([
    item("a", "A", "1.10"),
    item("b", "B", "2.20"),
  ]);
  check(
    "1.10 + 2.20 = 3.3",
    decimals[0].total === 3.3,
    String(decimals[0].total),
  );

  console.log("\n3. The same customer ordering twice becomes one line");
  const twice = aggregateItems([
    item("a", "A", "10.00", { orderId: "o1", orderNumber: 1 }),
    item("a", "A", "5.00", { orderId: "o2", orderNumber: 2 }),
  ]);
  check("1 customer", twice[0].customerCount === 1);
  check("15 in total", twice[0].customers[0].quantity === 15);
  check("both orders listed", twice[0].customers[0].orders.length === 2);

  console.log("\n4. Different units stay separate");
  const units = aggregateItems([
    item("a", "A", "2.00"),
    item("a", "A", "1.00", { unit: "box" }),
  ]);
  check("2 lines", units.length === 2);

  console.log("\n5. UK day boundaries");
  check(
    "summer day starts at 23:00 UTC the day before",
    londonDayStart("2026-07-01").toISOString() === "2026-06-30T23:00:00.000Z",
  );
  check(
    "winter day starts at 00:00 UTC",
    londonDayStart("2026-01-15").toISOString() === "2026-01-15T00:00:00.000Z",
  );
  check(
    "clock-change day",
    londonDayStart("2026-10-25").toISOString() === "2026-10-24T23:00:00.000Z",
  );
}

async function runDatabaseChecks() {
  const stamp = Date.now();
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const beef = await prisma.product.findFirst({
    where: { name: "Beef (Shin)", availability: "AVAILABLE", isActive: true },
  });
  if (!admin || !beef)
    throw new Error("Need an admin account and an available Beef (Shin).");

  const rowFor = (result) =>
    result.rows.find((r) => r.productId === beef.id && r.unit === beef.unit);
  const totalOf = (result) => rowFor(result)?.total ?? 0;
  const delta = (after, before) => Math.round((after - before) * 100);

  const before = {
    confirmed: totalOf(await getAggregate(prisma, { range: "confirmed" })),
    today: totalOf(await getAggregate(prisma, { range: "today" })),
    todayWithCancelled: totalOf(
      await getAggregate(prisma, { range: "today", includeCancelled: true }),
    ),
  };

  const users = [];
  const orders = [];
  const details = {
    phone: "+447000000000",
    address: "1 Test Street, Birmingham",
    postcode: "B1 1AA",
  };

  async function makeCustomer(letter) {
    const user = await prisma.user.create({
      data: {
        email: `agg-${letter}-${stamp}@example.test`.toLowerCase(),
        username: `agg_${letter}_${stamp}`,
        passwordHash: "not-a-real-hash",
        role: "CUSTOMER",
      },
    });
    users.push(user);
    return user;
  }

  async function order(user, letter, quantity) {
    const placed = await placeOrder(
      user.id,
      {
        ...details,
        fullName: `Aggregator Test ${letter}`,
        items: [{ productId: beef.id, quantity }],
      },
      prisma,
    );
    if (!placed.ok) throw new Error(JSON.stringify(placed));
    orders.push(placed.order.id);
    return placed.order.id;
  }

  try {
    console.log("\n6. Three real orders from three customers");
    for (const [letter, quantity] of [
      ["A", 30],
      ["B", 20],
      ["C", 15],
    ]) {
      const user = await makeCustomer(letter);
      const id = await order(user, letter, quantity);
      await changeOrderStatus(prisma, admin.id, id, "CONFIRMED");
    }
    const userD = await makeCustomer("D");
    const orderD = await order(userD, "D", 100);
    await changeOrderStatus(prisma, admin.id, orderD, "CANCELLED");

    const confirmed = await getAggregate(prisma, { range: "confirmed" });
    check(
      "confirmed total rose by exactly 65",
      delta(totalOf(confirmed), before.confirmed) === 6500,
    );
    const names = ["A", "B", "C"].map(
      (l) =>
        rowFor(confirmed)?.customers.find(
          (c) => c.name === `Aggregator Test ${l}`,
        )?.quantity,
    );
    check(
      "customers A, B, C show 30, 20, 15",
      names.join(",") === "30,20,15",
      names.join(","),
    );

    console.log("\n7. Cancelled orders");
    const today = await getAggregate(prisma, { range: "today" });
    check(
      "today (cancelled left out) rose by 65",
      delta(totalOf(today), before.today) === 6500,
    );
    const todayAll = await getAggregate(prisma, {
      range: "today",
      includeCancelled: true,
    });
    check(
      "today with cancelled included rose by 165",
      delta(totalOf(todayAll), before.todayWithCancelled) === 16500,
    );

    console.log("\n8. Bad filters give an error");
    check(
      "delivery without a date",
      Boolean((await getAggregate(prisma, { range: "delivery" })).error),
    );
    check(
      "custom range the wrong way round",
      Boolean(
        (
          await getAggregate(prisma, {
            range: "custom",
            from: "2026-10-20",
            to: "2026-10-01",
          })
        ).error,
      ),
    );
  } finally {
    for (const id of orders) {
      await prisma.adminAuditLog.deleteMany({ where: { targetId: id } });
      await prisma.order.delete({ where: { id } }).catch(() => {});
    }
    for (const user of users) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
    console.log(
      `\nTest data deleted: ${orders.length} orders, ${users.length} customers.`,
    );
  }
}

async function main() {
  runPureChecks();
  await runDatabaseChecks();
  console.log(
    failures === 0
      ? "\nRESULT: all checks passed."
      : `\nRESULT: ${failures} check(s) FAILED.`,
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
