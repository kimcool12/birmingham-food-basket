import Link from "next/link";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import { setAvailability, toggleProduct, deleteProduct } from "./actions";
import styles from "./products.module.scss";

export const metadata = { title: "Products | Admin" };

const PAGE_SIZE = 25;
const AVAILABILITY = ["AVAILABLE", "LIMITED", "UNAVAILABLE"];
const LABELS = {
  AVAILABLE: "Available",
  LIMITED: "Limited",
  UNAVAILABLE: "Unavailable",
};

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

export default async function AdminProductsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const q = String(sp.q ?? "").trim();
  const category = String(sp.category ?? "");
  const availability = AVAILABILITY.includes(sp.availability)
    ? sp.availability
    : "";
  const status = ["active", "inactive"].includes(sp.status) ? sp.status : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const error = sp.error;

  const where = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.categoryId = category;
  if (availability) where.availability = availability;
  if (status) where.isActive = status === "active";

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      include: { category: { select: { name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { q, category, availability, status };
  const returnTo = `/admin/products${buildQuery(filters, { page: page > 1 ? page : "" })}`;

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h1>Products ({total})</h1>
        <Link href="/admin/products/new" className={styles.addLink}>
          + Add Product
        </Link>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form method="get" className={styles.filters} role="search">
        <label className="sr-only" htmlFor="q" hidden>
          Search products
        </label>
        <input
          id="q"
          name="q"
          type="search"
          placeholder="Search name or brand"
          defaultValue={q}
        />
        <select name="category" defaultValue={category} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="availability"
          defaultValue={availability}
          aria-label="Availability"
        >
          <option value="">Any availability</option>
          {AVAILABILITY.map((a) => (
            <option key={a} value={a}>
              {LABELS[a]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">Active and inactive</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <button type="submit">Filter</button>
        <Link href="/admin/products" className={styles.btn}>
          Clear
        </Link>
      </form>

      {products.length === 0 ? (
        <p className={styles.empty}>No products found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Price</th>
                <th scope="col">Availability</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.isActive ? "" : styles.inactive}>
                  <td>
                    {p.name}
                    {p.size && (
                      <span className={styles.size}>Size: {p.size}</span>
                    )}
                    {!p.isActive && (
                      <span className={styles.size}>Inactive</span>
                    )}
                  </td>
                  <td>{p.category.name}</td>
                  <td>
                    £{Number(p.price).toFixed(2)} / {p.unit}
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${styles[p.availability]}`}
                    >
                      {LABELS[p.availability]}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className={styles.btn}
                    >
                      Edit
                    </Link>{" "}
                    <form action={setAvailability} className={styles.inline}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <select
                        name="availability"
                        defaultValue={p.availability}
                        aria-label={`Availability for ${p.name}`}
                      >
                        {AVAILABILITY.map((a) => (
                          <option key={a} value={a}>
                            {LABELS[a]}
                          </option>
                        ))}
                      </select>
                      <button type="submit">Set</button>
                    </form>
                    <form action={toggleProduct} className={styles.inline}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button type="submit">
                        {p.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteProduct} className={styles.inline}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button type="submit" className={styles.danger}>
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link
              href={`/admin/products${buildQuery(filters, { page: page - 1 })}`}
              className={styles.btn}
            >
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/admin/products${buildQuery(filters, { page: page + 1 })}`}
              className={styles.btn}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
