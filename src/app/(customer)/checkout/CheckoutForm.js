"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, removeItem, clearCart } from "../../../lib/cart-store";
import { previewCart, submitOrder } from "./actions";
import styles from "./checkout.module.scss";

const EMPTY_REQUEST = { itemName: "", quantity: "", note: "" };

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

export default function CheckoutForm({ defaults }) {
  const router = useRouter();
  const cart = useCart();
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [itemErrors, setItemErrors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [placed, setPlaced] = useState(false);
  const [pending, startTransition] = useTransition();

  const key = cart.map((i) => `${i.productId}:${i.quantity}`).join("|");
  const payloadItems = cart.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || cart.length === 0) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    previewCart(payloadItems)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({
            ok: false,
            errors: [
              { message: "Unable to check your cart. Please try again." },
            ],
          });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  function updateRequest(index, field, value) {
    setRequests((list) =>
      list.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});
    setItemErrors([]);

    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      whatsapp: form.get("whatsapp"),
      address: form.get("address"),
      postcode: form.get("postcode"),
      notes: form.get("notes"),
      customRequests: requests,
      items: payloadItems,
    };

    startTransition(async () => {
      try {
        const result = await submitOrder(payload);
        if (result.ok) {
          setPlaced(true);
          router.push(`/orders/${result.order.id}`);
          clearCart();
          return;
        }
        setMessage(
          result.message || "Unable to place your order. Please try again.",
        );
        setFieldErrors(result.errors || {});
        setItemErrors(result.itemErrors || []);
      } catch {
        setMessage(
          "Network error. Please check your connection and try again.",
        );
      }
    });
  }

  if (!ready) return <p>Loading your checkout...</p>;
  if (placed)
    return <p role="status">Order placed. Taking you to your order...</p>;

  if (cart.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Your cart is empty.</p>
        <Link href="/shop" className={styles.back}>
          Start shopping
        </Link>
      </div>
    );
  }

  const problems = preview && !preview.ok ? preview.errors : itemErrors;
  const canPlace = Boolean(preview?.ok) && !loading && !pending;

  return (
    <form onSubmit={handleSubmit} className={styles.layout} noValidate>
      <div className={styles.card}>
        <h2>Delivery details</h2>

        {message && (
          <p className={styles.alert} role="alert">
            {message}
          </p>
        )}

        <Field id="fullName" label="Full name" error={fieldErrors.fullName}>
          <input
            id="fullName"
            name="fullName"
            defaultValue={defaults.fullName}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.fullName)}
          />
        </Field>

        <div className={styles.row}>
          <Field id="phone" label="Phone" error={fieldErrors.phone}>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={defaults.phone}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
            />
          </Field>
          <Field id="whatsapp" label="WhatsApp" error={fieldErrors.whatsapp}>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={defaults.whatsapp}
              aria-invalid={Boolean(fieldErrors.whatsapp)}
            />
          </Field>
        </div>

        <Field
          id="address"
          label="Delivery address"
          error={fieldErrors.address}
        >
          <textarea
            id="address"
            name="address"
            defaultValue={defaults.address}
            autoComplete="street-address"
            aria-invalid={Boolean(fieldErrors.address)}
          />
        </Field>

        <Field id="postcode" label="Postcode" error={fieldErrors.postcode}>
          <input
            id="postcode"
            name="postcode"
            defaultValue={defaults.postcode}
            autoComplete="postal-code"
            aria-invalid={Boolean(fieldErrors.postcode)}
          />
        </Field>

        <Field
          id="notes"
          label="Additional notes (optional)"
          error={fieldErrors.notes}
        >
          <textarea
            id="notes"
            name="notes"
            placeholder="Please call before delivery."
            maxLength={500}
          />
        </Field>

        <h2>Can&apos;t find what you need?</h2>
        {fieldErrors.customRequests && (
          <span className={styles.fieldError} role="alert">
            {fieldErrors.customRequests}
          </span>
        )}
        {requests.map((request, index) => (
          <div key={index} className={styles.request}>
            <Field id={`req-name-${index}`} label="Requested item">
              <input
                id={`req-name-${index}`}
                value={request.itemName}
                onChange={(e) =>
                  updateRequest(index, "itemName", e.target.value)
                }
                maxLength={100}
              />
            </Field>
            <Field id={`req-qty-${index}`} label="Quantity">
              <input
                id={`req-qty-${index}`}
                value={request.quantity}
                onChange={(e) =>
                  updateRequest(index, "quantity", e.target.value)
                }
                placeholder="20kg"
                maxLength={40}
              />
            </Field>
            <Field id={`req-note-${index}`} label="Additional note">
              <textarea
                id={`req-note-${index}`}
                value={request.note}
                onChange={(e) => updateRequest(index, "note", e.target.value)}
                maxLength={300}
              />
            </Field>
            <button
              type="button"
              className={styles.small}
              onClick={() =>
                setRequests((list) => list.filter((_, i) => i !== index))
              }
            >
              Remove this request
            </button>
          </div>
        ))}
        {requests.length < 10 && (
          <button
            type="button"
            className={styles.ghost}
            onClick={() =>
              setRequests((list) => [...list, { ...EMPTY_REQUEST }])
            }
          >
            + Add a custom request
          </button>
        )}
      </div>

      <aside className={styles.card} aria-label="Order review">
        <h2>Review your order</h2>

        {loading && <p role="status">Checking prices...</p>}

        {problems && problems.length > 0 && (
          <div className={styles.alert} role="alert">
            <ul className={styles.alertList}>
              {problems.map((problem, index) => (
                <li key={index} className={styles.alertItem}>
                  <span>{problem.message}</span>
                  {problem.productId && (
                    <button
                      type="button"
                      className={styles.small}
                      onClick={() => removeItem(problem.productId)}
                    >
                      Remove from cart
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview?.ok && (
          <>
            <ul className={styles.lines}>
              {preview.lines.map((line) => (
                <li key={line.productId} className={styles.line}>
                  <div>
                    {line.productName}
                    <br />
                    <span>
                      {Number(line.quantity)} {line.unit} × £{line.unitPrice}
                    </span>
                  </div>
                  <strong>£{line.lineTotal}</strong>
                </li>
              ))}
            </ul>
            <p className={styles.total}>
              <span>Total</span>
              <strong>£{preview.total}</strong>
            </p>
            <p className={styles.hint}>
              Prices and total are calculated by our server.
            </p>
          </>
        )}

        <button type="submit" className={styles.place} disabled={!canPlace}>
          {pending ? "Placing order..." : "Place Order"}
        </button>
        <Link href="/cart" className={styles.back}>
          Back to cart
        </Link>
      </aside>
    </form>
  );
}
