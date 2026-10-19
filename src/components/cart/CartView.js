"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuantityControl from "../products/QuantityControl";
import {
  useCart,
  setQuantity,
  removeItem,
  clearCart,
} from "../../lib/cart-store";
import styles from "./CartView.module.scss";

function pence(price) {
  return Math.round(Number(price) * 100);
}

function money(totalPence) {
  return `£${(totalPence / 100).toFixed(2)}`;
}

export default function CartView() {
  const items = useCart();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <p className={styles.note}>Loading your cart...</p>;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Your cart is empty.</p>
        <Link href="/shop" className={styles.primary}>
          Start shopping
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + pence(item.price) * item.quantity,
    0,
  );

  return (
    <div className={styles.layout}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.productId} className={styles.item}>
            <div className={styles.info}>
              <h2 className={styles.name}>{item.name}</h2>
              <p className={styles.line}>
                {item.quantity} {item.unit} × £{Number(item.price).toFixed(2)} ={" "}
                <strong>{money(pence(item.price) * item.quantity)}</strong>
              </p>
            </div>
            <div className={styles.controls}>
              <QuantityControl
                value={item.quantity}
                onChange={(n) => setQuantity(item.productId, n)}
                unit={item.unit}
                label={`Quantity of ${item.name}`}
              />
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeItem(item.productId)}
                aria-label={`Remove ${item.name} from cart`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className={styles.summary} aria-label="Cart summary">
        <h2>Summary</h2>
        <p className={styles.row}>
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </p>
        <p className={styles.hint}>
          Final prices are confirmed when you place your order.
        </p>
        <Link href="/checkout" className={styles.primary}>
          Checkout
        </Link>
        <Link href="/shop" className={styles.secondary}>
          Continue shopping
        </Link>
        <button type="button" className={styles.clear} onClick={clearCart}>
          Clear cart
        </button>
      </aside>
    </div>
  );
}
