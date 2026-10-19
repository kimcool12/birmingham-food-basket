"use client";

import { useActionState, useState } from "react";
import { cancelOrder } from "./actions";
import styles from "./cancel.module.scss";

export default function CancelOrder({ orderId }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(cancelOrder, {
    ok: false,
    message: "",
  });

  return (
    <div className={styles.box}>
      {state.message && !state.ok && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      {state.ok && (
        <p className={styles.ok} role="status">
          {state.message}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          className={styles.danger}
          onClick={() => setConfirming(true)}
        >
          Cancel this order
        </button>
      ) : (
        <form action={formAction} className={styles.confirm}>
          <input type="hidden" name="orderId" value={orderId} />
          <p>
            <strong>Are you sure?</strong> This cannot be undone.
          </p>
          <div className={styles.row}>
            <button type="submit" className={styles.danger} disabled={pending}>
              {pending ? "Cancelling..." : "Yes, cancel my order"}
            </button>
            <button
              type="button"
              className={styles.keep}
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Keep my order
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
