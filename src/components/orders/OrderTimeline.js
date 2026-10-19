import {
  STATUS_FLOW,
  STATUS_LABELS,
  formatDateTime,
} from "../../lib/order-status";
import styles from "./OrderTimeline.module.scss";

export default function OrderTimeline({ status, history, createdAt }) {
  const reached = new Map();
  for (const entry of history) {
    if (!reached.has(entry.status)) reached.set(entry.status, entry.createdAt);
  }
  if (!reached.has("ORDER_PLACED")) reached.set("ORDER_PLACED", createdAt);

  const cancelled = status === "CANCELLED";
  const steps = cancelled
    ? [...STATUS_FLOW.filter((s) => reached.has(s)), "CANCELLED"]
    : STATUS_FLOW;
  const currentIndex = cancelled
    ? steps.length - 1
    : STATUS_FLOW.indexOf(status);

  return (
    <ol className={styles.timeline} aria-label="Order progress">
      {steps.map((step, index) => {
        let state = "upcoming";
        if (index < currentIndex) state = "done";
        if (index === currentIndex) state = cancelled ? "cancelled" : "current";
        if (!cancelled && step === "DELIVERED" && status === "DELIVERED")
          state = "done";

        const mark = { done: "✓", current: "●", upcoming: "○", cancelled: "✕" }[
          state
        ];
        const word = {
          done: "Done",
          current: "Current",
          upcoming: "Next",
          cancelled: "Cancelled",
        }[state];
        const time = reached.get(step);

        return (
          <li
            key={step}
            className={`${styles.step} ${styles[state]}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className={styles.mark} aria-hidden="true">
              {mark}
            </span>
            <div>
              <strong>{STATUS_LABELS[step]}</strong>
              <span className={styles.word}> · {word}</span>
              {time && <p className={styles.time}>{formatDateTime(time)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
