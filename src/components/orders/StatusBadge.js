import { STATUS_LABELS, statusMark } from "../../lib/order-status";
import styles from "./StatusBadge.module.scss";

export default function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status] ?? ""}`}>
      <span aria-hidden="true">{statusMark(status)}</span>{" "}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
