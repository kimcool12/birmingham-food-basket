import prisma from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/permissions";
import { createProduct } from "../actions";
import ProductForm from "../product-form";
import styles from "../form.module.scss";

export const metadata = { title: "Add Product | Admin" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <main className={styles.page}>
      <h1>Add Product</h1>
      <ProductForm
        action={createProduct}
        categories={categories}
        submitLabel="Add product"
      />
    </main>
  );
}
