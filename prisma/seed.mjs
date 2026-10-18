import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";

const { PrismaClient } = generated;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const file = path.join(process.cwd(), "data", "products.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

async function main() {
  const categoryIds = {};
  let categoriesAdded = 0;

  for (const c of data.categories) {
    let category = await prisma.category.findFirst({
      where: { OR: [{ slug: c.slug }, { name: c.name }] },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: c.name, slug: c.slug, sortOrder: c.sortOrder },
      });
      categoriesAdded += 1;
    }
    categoryIds[c.name] = category.id;
  }

  let productsAdded = 0;
  let productsSkipped = 0;

  for (const p of data.products) {
    const categoryId = categoryIds[p.category];
    if (!categoryId) throw new Error(`Unknown category: ${p.category}`);

    const existing = await prisma.product.findFirst({
      where: { categoryId, name: p.name, size: p.size },
      select: { id: true },
    });
    if (existing) {
      productsSkipped += 1;
      continue;
    }

    await prisma.product.create({
      data: {
        categoryId,
        name: p.name,
        size: p.size,
        unit: p.unit,
        price: p.price ?? "0.00",
        availability: p.availability,
        description: p.description,
      },
    });
    productsAdded += 1;
  }

  console.log(`Categories added: ${categoriesAdded}`);
  console.log(`Products added: ${productsAdded}`);
  console.log(`Products already there (left untouched): ${productsSkipped}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
