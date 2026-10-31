'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSession, signIn } from 'next-auth/react';
import { loginTarget } from '../../../lib/login-redirect';
import styles from '../auth.module.scss';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    });

    if (!result || result.error) {
      setLoading(false);
      setError('Incorrect email or password.');
      return;
    }

    // Read the role from the new session, then send admins to the dashboard.
    const session = await getSession();
    const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
    window.location.href = loginTarget(session?.user?.role, callbackUrl);
  }

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <h1 className={styles.title}>Log in</h1>
        <p className={styles.sub}>Welcome back to Birmingham Food Basket.</p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className={styles.switch}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
