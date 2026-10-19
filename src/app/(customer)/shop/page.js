import { Suspense } from "react";
import Link from "next/link";
import prisma from "../../../lib/prisma";
import ProductCard from "../../../components/products/ProductCard";
import SearchBox from "./SearchBox";
import styles from "./shop.module.scss";

export const metadata = {
  title: "Shop | Birmingham Food Basket",
  description:
    "Browse fresh vegetables, meat, poultry, fish and groceries by the box or by the kilo.",
};

const PAGE_SIZE = 24;

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const categorySlug = String(sp.category ?? "");
  const onlyAvailable = sp.available === "1";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  const where = { isActive: true, category: { isActive: true } };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (categorySlug) where.category = { isActive: true, slug: categorySlug };
  if (onlyAvailable) where.availability = { not: "UNAVAILABLE" };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const products = rows.map((p) => ({
    id: p.id,
    name: p.name,
    size: p.size,
    unit: p.unit,
    price: Number(p.price),
    availability: p.availability,
    image: p.image,
  }));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = {
    q,
    category: categorySlug,
    available: onlyAvailable ? "1" : "",
  };

  return (
    <main className={styles.page}>
      <h1>Shop</h1>

      <Suspense fallback={null}>
        <SearchBox initial={q} />
      </Suspense>

      <nav className={styles.tabs} aria-label="Categories">
        <Link
          href={`/shop${buildQuery(current, { category: "", page: "" })}`}
          className={`${styles.tab} ${!categorySlug ? styles.tabActive : ""}`}
          aria-current={!categorySlug ? "page" : undefined}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop${buildQuery(current, { category: c.slug, page: "" })}`}
            className={`${styles.tab} ${categorySlug === c.slug ? styles.tabActive : ""}`}
            aria-current={categorySlug === c.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className={styles.toolbar}>
        <span>
          {total} product{total === 1 ? "" : "s"}
        </span>
        <Link
          className={styles.toggle}
          href={`/shop${buildQuery(current, { available: onlyAvailable ? "" : "1", page: "" })}`}
        >
          {onlyAvailable ? "Show unavailable too" : "Hide unavailable"}
        </Link>
      </div>

      {products.length === 0 ? (
        <p className={styles.empty}>No products found.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link href={`/shop${buildQuery(current, { page: page - 1 })}`}>
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/shop${buildQuery(current, { page: page + 1 })}`}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
