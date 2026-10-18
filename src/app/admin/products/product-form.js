"use client";

import { useActionState } from "react";
import Link from "next/link";
import styles from "./form.module.scss";

const UNITS = ["KG", "box", "each", "bag", "pack", "litre"];
const EMPTY = {
  name: "",
  categoryId: "",
  brand: "",
  size: "",
  unit: "",
  price: "",
  availability: "AVAILABLE",
  stock: "0",
  description: "",
};

function Field({ id, label, error, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function ProductForm({
  action,
  categories,
  product,
  submitLabel,
}) {
  const [state, formAction, pending] = useActionState(action, {
    errors: {},
    values: null,
    message: "",
  });
  const v = state.values ?? product ?? EMPTY;
  const e = state.errors ?? {};

  return (
    <form action={formAction} className={styles.form} noValidate>
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      {state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <Field id="name" label="Product name" error={e.name}>
        <input
          id="name"
          name="name"
          defaultValue={v.name}
          maxLength={120}
          required
          aria-invalid={Boolean(e.name)}
        />
      </Field>

      <Field id="categoryId" label="Category" error={e.categoryId}>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={v.categoryId}
          required
          aria-invalid={Boolean(e.categoryId)}
        >
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <div className={styles.row}>
        <Field id="brand" label="Brand (optional)" error={e.brand}>
          <input
            id="brand"
            name="brand"
            defaultValue={v.brand}
            maxLength={60}
          />
        </Field>
        <Field id="size" label="Size (optional)" error={e.size}>
          <input
            id="size"
            name="size"
            defaultValue={v.size}
            maxLength={40}
            placeholder="for example 10kg"
          />
        </Field>
      </div>

      <div className={styles.row}>
        <Field id="price" label="Price (£)" error={e.price}>
          <input
            id="price"
            name="price"
            defaultValue={v.price}
            inputMode="decimal"
            required
            aria-invalid={Boolean(e.price)}
            placeholder="12.50"
          />
        </Field>
        <Field id="unit" label="Unit" error={e.unit}>
          <input
            id="unit"
            name="unit"
            list="unit-options"
            defaultValue={v.unit}
            maxLength={20}
            required
            aria-invalid={Boolean(e.unit)}
            placeholder="KG, box, each"
          />
          <datalist id="unit-options">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className={styles.row}>
        <Field id="availability" label="Availability" error={e.availability}>
          <select
            id="availability"
            name="availability"
            defaultValue={v.availability}
          >
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </Field>
        <Field id="stock" label="Stock" error={e.stock}>
          <input
            id="stock"
            name="stock"
            defaultValue={v.stock}
            inputMode="decimal"
            aria-invalid={Boolean(e.stock)}
          />
        </Field>
      </div>

      <Field
        id="description"
        label="Description or note (optional)"
        error={e.description}
      >
        <textarea
          id="description"
          name="description"
          defaultValue={v.description}
          maxLength={500}
        />
      </Field>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link href="/admin/products" className={styles.cancel}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
