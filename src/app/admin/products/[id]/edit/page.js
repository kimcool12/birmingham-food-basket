import { notFound } from "next/navigation";
import prisma from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/permissions";
import { updateProduct } from "../../actions";
import ProductForm from "../../product-form";
import styles from "../../form.module.scss";

export const metadata = { title: "Edit Product | Admin" };

export default async function EditProductPage({ params }) {
  await requireAdmin();
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  if (!product) notFound();

  const initial = {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    brand: product.brand ?? "",
    size: product.size ?? "",
    unit: product.unit,
    price: Number(product.price).toFixed(2),
    availability: product.availability,
    stock: String(product.stock),
    description: product.description ?? "",
  };

  return (
    <main className={styles.page}>
      <h1>Edit Product</h1>
      <ProductForm
        action={updateProduct}
        categories={categories}
        product={initial}
        submitLabel="Save changes"
      />
    </main>
  );
}
