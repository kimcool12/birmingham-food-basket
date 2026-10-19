"use client";

import { useEffect, useState } from "react";
import QuantityControl from "./QuantityControl";
import { addItem } from "../../lib/cart-store";
import styles from "./ProductCard.module.scss";

function Placeholder() {
  return (
    <svg
      className={styles.placeholder}
      viewBox="0 0 64 64"
      role="img"
      aria-label="No product image"
    >
      <path
        d="M10 26h44l-5 26a4 4 0 0 1-4 3H19a4 4 0 0 1-4-3l-5-26Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M22 26l8-14M42 26l-8-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ProductCard({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  const unavailable = product.availability === "UNAVAILABLE";
  const limited = product.availability === "LIMITED";

  function handleAdd() {
    addItem(product, quantity);
    setAdded(true);
    setQuantity(1);
  }

  return (
    <article className={`${styles.card} ${unavailable ? styles.off : ""}`}>
      <div className={styles.media}>
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <Placeholder />
        )}
        {limited && <span className={styles.tag}>Limited stock</span>}
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        {product.size && <p className={styles.size}>{product.size}</p>}
        <p className={styles.price}>
          £{Number(product.price).toFixed(2)} <span>/ {product.unit}</span>
        </p>

        {unavailable ? (
          <p className={styles.unavailable}>Currently Unavailable</p>
        ) : (
          <>
            <QuantityControl
              value={quantity}
              onChange={setQuantity}
              unit={product.unit}
              label={`Quantity of ${product.name}`}
            />
            <button type="button" className={styles.add} onClick={handleAdd}>
              Add to Cart
            </button>
            <p className={styles.added} role="status" aria-live="polite">
              {added ? "Added to your cart" : ""}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
