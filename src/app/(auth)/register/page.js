"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.scss";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: form.get("email"),
      username: form.get("username"),
      password: form.get("password"),
      whatsapp: form.get("whatsapp"),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to create your account.");
        setFieldErrors(data.errors || {});
        setLoading(false);
        return;
      }
      window.location.href = "/login";
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.sub}>Order fresh food in bulk or retail.</p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            {fieldErrors.email && (
              <span className={styles.fieldError}>{fieldErrors.email}</span>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
            />
            {fieldErrors.username && (
              <span className={styles.fieldError}>{fieldErrors.username}</span>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password (min. 6 characters)</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            {fieldErrors.password && (
              <span className={styles.fieldError}>{fieldErrors.password}</span>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="whatsapp">WhatsApp number</label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              required
            />
            {fieldErrors.whatsapp && (
              <span className={styles.fieldError}>{fieldErrors.whatsapp}</span>
            )}
          </div>
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className={styles.switch}>
          Already registered? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
