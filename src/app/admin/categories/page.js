import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";
import {
  createCategory,
  renameCategory,
  toggleCategory,
  deleteCategory,
} from "./actions";
import styles from "./categories.module.scss";

export const metadata = { title: "Categories | Admin" };

export default async function AdminCategoriesPage({ searchParams }) {
  await requireAdmin();
  const { error } = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Categories</h1>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form action={createCategory} className={styles.createForm}>
        <label className={styles.srOnly} htmlFor="new-category">
          New category name
        </label>
        <input
          id="new-category"
          name="name"
          type="text"
          placeholder="New category name"
          required
          minLength={2}
          maxLength={60}
        />
        <button type="submit" className={styles.primary}>
          + Add category
        </button>
      </form>

      {categories.length === 0 ? (
        <p className={styles.empty}>
          No categories yet. Add your first one above.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Products</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <form action={renameCategory} className={styles.inline}>
                      <input type="hidden" name="id" value={category.id} />
                      <label
                        className={styles.srOnly}
                        htmlFor={`name-${category.id}`}
                      >
                        Category name
                      </label>
                      <input
                        id={`name-${category.id}`}
                        name="name"
                        type="text"
                        defaultValue={category.name}
                        required
                        minLength={2}
                        maxLength={60}
                      />
                      <button type="submit">Save</button>
                    </form>
                  </td>
                  <td>{category._count.products}</td>
                  <td>{category.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <form action={toggleCategory} className={styles.inline}>
                      <input type="hidden" name="id" value={category.id} />
                      <button type="submit">
                        {category.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteCategory} className={styles.inline}>
                      <input type="hidden" name="id" value={category.id} />
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
    </main>
  );
}
