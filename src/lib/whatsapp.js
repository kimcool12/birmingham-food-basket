import { formatDate } from './order-status.js';

// Turns a phone number into the digits WhatsApp links need.
// Numbers starting with + or 00 are used as given. A number starting with a single 0 is
// treated as a UK number.
export function whatsappDigits(raw) {
  const text = String(raw ?? '').trim();
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (text.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `44${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(raw, message) {
  const digits = whatsappDigits(raw);
  if (digits.length < 8 || digits.length > 15) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

// Ready-made messages for an order. The admin presses send inside WhatsApp.
export function orderMessages(order, delivery) {
  const name = String(order.fullName ?? '').trim().split(/\s+/)[0] || 'there';
  const n = order.orderNumber;
  const messages = [
    {
      key: 'approaching',
      label: 'Delivery approaching',
      text: `Hello ${name}, your Birmingham Food Basket order #${n} is about to be delivered. Please make sure someone is available to receive it.`,
    },
    {
      key: 'call',
      label: 'We will call first',
      text: `Hello ${name}, we will call you before delivering your Birmingham Food Basket order #${n}.`,
    },
  ];
  if (delivery?.deliveryDate) {
    const time = delivery.deliveryTime ? ` (${delivery.deliveryTime})` : '';
    messages.splice(1, 0, {
      key: 'scheduled',
      label: 'Delivery scheduled',
      text: `Hello ${name}, your Birmingham Food Basket order #${n} is scheduled for delivery on ${formatDate(delivery.deliveryDate)}${time}.`,
    });
  }
  return messages;
}
