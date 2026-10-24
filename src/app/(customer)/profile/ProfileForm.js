'use client';

import { useActionState } from 'react';
import { saveProfile } from './actions';
import styles from './profile.module.scss';

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

export default function ProfileForm({ defaults }) {
  const [state, formAction, pending] = useActionState(saveProfile, {
    ok: false,
    errors: {},
    values: null,
    message: '',
  });
  const v = state.values ?? defaults;
  const e = state.errors ?? {};

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message && (
        <p className={state.ok ? styles.ok : styles.alert} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      )}

      <Field id="fullName" label="Full name" error={e.fullName}>
        <input id="fullName" name="fullName" defaultValue={v.fullName} autoComplete="name" aria-invalid={Boolean(e.fullName)} />
      </Field>

      <div className={styles.row}>
        <Field id="phone" label="Phone" error={e.phone}>
          <input id="phone" name="phone" type="tel" defaultValue={v.phone} autoComplete="tel" aria-invalid={Boolean(e.phone)} />
        </Field>
        <Field id="whatsapp" label="WhatsApp" error={e.whatsapp}>
          <input id="whatsapp" name="whatsapp" type="tel" defaultValue={v.whatsapp} aria-invalid={Boolean(e.whatsapp)} />
        </Field>
      </div>

      <Field id="address" label="Delivery address" error={e.address}>
        <textarea id="address" name="address" defaultValue={v.address} autoComplete="street-address" aria-invalid={Boolean(e.address)} />
      </Field>

      <Field id="postcode" label="Postcode" error={e.postcode}>
        <input id="postcode" name="postcode" defaultValue={v.postcode} autoComplete="postal-code" aria-invalid={Boolean(e.postcode)} />
      </Field>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? 'Saving...' : 'Save details'}
      </button>
    </form>
  );
}
