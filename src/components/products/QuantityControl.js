"use client";

import styles from "./QuantityControl.module.scss";

export default function QuantityControl({
  value,
  onChange,
  unit,
  label = "Quantity",
  min = 1,
  max = 999,
}) {
  function set(next) {
    const n = Math.floor(Number(next));
    if (!Number.isFinite(n)) {
      onChange(min);
      return;
    }
    onChange(Math.min(max, Math.max(min, n)));
  }

  return (
    <div className={styles.wrap} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <input
        className={styles.input}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => set(event.target.value)}
        aria-label={label}
      />
      <button
        type="button"
        className={styles.btn}
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
      {unit && <span className={styles.unit}>{unit}</span>}
    </div>
  );
}
