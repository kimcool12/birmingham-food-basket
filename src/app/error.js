'use client';

import { useEffect } from 'react';
import styles from './error.module.scss';

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // The real error stays in the server log. Visitors only see this friendly message.
  return (
    <main className={styles.wrap} role="alert">
      <h1>Something went wrong</h1>
      <p>We could not load this page. Please try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
