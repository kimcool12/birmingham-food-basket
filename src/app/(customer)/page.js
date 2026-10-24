import Image from 'next/image';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import ProductCard from '../../components/products/ProductCard';
import styles from './home.module.scss';

const TITLE = 'Birmingham Food Basket';
const DESCRIPTION =
  'Order vegetables, meat, poultry, fish and groceries in wholesale and retail quantities.';

// Edit the two lines below to change the words on the home page banner.
const HERO_HEADING = 'Birmingham Food Basket';
const HERO_TEXT =
  'Order vegetables, meat, poultry, fish and groceries in wholesale and retail quantities.';

export const metadata = {
  title: `${TITLE} | Wholesale and retail food ordering`,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
};

export default async function HomePage() {
  const [categories, rows] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        availability: { not: 'UNAVAILABLE' },
        category: { isActive: true },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
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

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroContent}>
          <h1 id="hero-title">{HERO_HEADING}</h1>
          <p>{HERO_TEXT}</p>
          <div className={styles.actions}>
            <Link href="/shop" className={styles.primary}>
              Shop now
            </Link>
            <Link href="/categories" className={styles.secondary}>
              Browse categories
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="cats">
          <h2 id="cats">Shop by category</h2>
          <ul className={styles.tiles}>
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/shop?category=${encodeURIComponent(category.slug)}`} className={styles.tile}>
                  <strong>{category.name}</strong>
                  <span>
                    {category._count.products} product{category._count.products === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="available">
        <div className={styles.sectionHead}>
          <h2 id="available">Available now</h2>
          <Link href="/shop">See all products</Link>
        </div>
        {products.length === 0 ? (
          <p className={styles.empty}>No products are available right now. Please check back soon.</p>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
