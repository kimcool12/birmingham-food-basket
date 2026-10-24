import styles from './PageLoading.module.scss';

export default function PageLoading({ label = 'Loading...' }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
