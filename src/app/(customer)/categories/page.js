import Link from 'next/link';
import prisma from '../../../lib/prisma';
import styles from './categories.module.scss';

export const metadata = {
  title: 'Categories | Birmingham Food Basket',
  description: 'Browse vegetables, meat, poultry, fish and groceries by category.',
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  return (
    <div className={styles.page}>
      <h1>Categories</h1>

      {categories.length === 0 ? (
        <p className={styles.empty}>No categories yet.</p>
      ) : (
        <ul className={styles.grid}>
          <li>
            <Link href="/shop" className={styles.tile}>
              <h2>All products</h2>
              <span className={styles.count}>Browse everything</span>
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/shop?category=${encodeURIComponent(category.slug)}`} className={styles.tile}>
                <h2>{category.name}</h2>
                {category.description && <p>{category.description}</p>}
                <span className={styles.count}>
                  {category._count.products} product{category._count.products === 1 ? '' : 's'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
