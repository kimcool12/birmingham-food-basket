'use client';

import { useActionState } from 'react';
import { saveSettings } from './actions';
import styles from './settings.module.scss';

function Field({ id, label, hint, error, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {hint && <span className={styles.hint}>{hint}</span>}
      {children}
      {error && (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function SettingsForm({ defaults, standard }) {
  const [state, formAction, pending] = useActionState(saveSettings, {
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

      <Field
        id="hero_heading"
        label="Home page banner heading"
        hint={`Leave empty to use: ${standard.hero_heading}`}
        error={e.hero_heading}
      >
        <input id="hero_heading" name="hero_heading" defaultValue={v.hero_heading} maxLength={80} />
      </Field>

      <Field
        id="hero_text"
        label="Home page banner text"
        hint="Leave empty to use the standard sentence."
        error={e.hero_text}
      >
        <textarea id="hero_text" name="hero_text" defaultValue={v.hero_text} maxLength={300} />
      </Field>

      <Field
        id="delivery_info"
        label="Delivery information (shown on the home page)"
        hint="For example: We deliver on Tuesdays and Fridays. Leave empty to show nothing."
        error={e.delivery_info}
      >
        <textarea id="delivery_info" name="delivery_info" defaultValue={v.delivery_info} maxLength={300} />
      </Field>

      <Field
        id="contact_whatsapp"
        label="Business WhatsApp number"
        hint="Shown on the home page as a link customers can use to message you. Leave empty to hide it."
        error={e.contact_whatsapp}
      >
        <input id="contact_whatsapp" name="contact_whatsapp" type="tel" defaultValue={v.contact_whatsapp} />
      </Field>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  );
}
