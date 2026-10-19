import Link from "next/link";
import styles from "./not-found.module.scss";

export const metadata = {
  title: "Page not found | Birmingham Food Basket",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <h1>Page not found</h1>
      <p>
        We could not find that page, or it is not available to your account.
      </p>
      <div className={styles.actions}>
        <Link href="/shop" className={styles.primary}>
          Go to the shop
        </Link>
        <Link href="/orders" className={styles.secondary}>
          My orders
        </Link>
      </div>
    </main>
  );
}
