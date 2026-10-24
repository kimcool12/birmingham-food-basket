import { saveDelivery, sendNotification } from './actions';
import { orderMessages, whatsappLink } from '../../../../lib/whatsapp';
import styles from './delivery-panel.module.scss';

export default function DeliveryPanel({ order, returnTo }) {
  const delivery = order.delivery;
  const dateValue = delivery?.deliveryDate ? delivery.deliveryDate.toISOString().slice(0, 10) : '';

  const number = order.whatsapp || order.phone;
  const chats = orderMessages(order, delivery)
    .map((message) => ({ ...message, href: whatsappLink(number, message.text) }))
    .filter((message) => message.href);

  return (
    <section className="delivery-panel-card" aria-labelledby="delivery-tools" style={{ gridColumn: '1 / -1' }}>
      <div className={styles.forms}>
        <form action={saveDelivery} className={styles.form}>
          <h3 id="delivery-tools">Schedule delivery</h3>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className={styles.field}>
            Delivery date
            <input name="date" type="date" defaultValue={dateValue} required />
          </label>
          <label className={styles.field}>
            Time or window (optional)
            <input
              name="time"
              defaultValue={delivery?.deliveryTime ?? ''}
              maxLength={40}
              placeholder="Between 2pm and 4pm"
            />
          </label>
          <button type="submit" className={styles.submit}>
            Save delivery
          </button>
        </form>

        <form action={sendNotification} className={styles.form}>
          <h3>Notify customer</h3>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className={styles.field}>
            Message
            <select name="kind" defaultValue="approaching">
              <option value="approaching">Delivery approaching</option>
              <option value="scheduled">Delivery scheduled (uses the saved date)</option>
              <option value="call">We will call before delivery</option>
              <option value="custom">Custom message</option>
            </select>
          </label>
          <label className={styles.field}>
            Custom message (only used when &quot;Custom message&quot; is chosen)
            <textarea name="message" maxLength={500} />
          </label>
          <button type="submit" className={styles.submit}>
            Notify customer
          </button>
          <p className={styles.hint}>
            This creates a notification inside the app. WhatsApp, SMS and email are not connected,
            so nothing is sent outside the app.
          </p>
        </form>
      </div>

      {chats.length > 0 && (
        <div className={styles.whatsapp}>
          <h3>Message on WhatsApp</h3>
          <p className={styles.hint}>
            Each link opens WhatsApp with the customer&apos;s number and the message already typed.
            You press send there. This is manual: the system cannot tell whether you sent it.
          </p>
          <ul className={styles.links}>
            {chats.map((chat) => (
              <li key={chat.key}>
                <a href={chat.href} target="_blank" rel="noopener noreferrer">
                  {chat.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
