'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '../../../lib/prisma';
import { requireAdmin } from '../../../lib/permissions';
import { sendExternal } from '../../../lib/notify-provider';

const BASE = '/admin/notifications';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function go(key, message) {
  redirect(`${BASE}?${key}=${encodeURIComponent(message)}`);
}

export async function sendToCustomer(formData) {
  const admin = await requireAdmin();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const message = String(formData.get('message') ?? '').trim();

  if (!EMAIL_RE.test(email)) go('error', 'Enter the customer email address.');
  if (message.length < 3 || message.length > 500) {
    go('error', 'The message must be 3 to 500 characters.');
  }

  const customer = await prisma.user.findFirst({
    where: { email, role: 'CUSTOMER' },
    select: { id: true, username: true },
  });
  if (!customer) go('error', 'No customer account has that email address.');

  // Nothing leaves the app unless a real provider is configured in notify-provider.js.
  const external = await sendExternal({ to: email, message });

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: customer.id,
        type: 'CUSTOM',
        channel: 'app',
        externalSent: Boolean(external?.sent),
        message,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'CUSTOMER_NOTIFIED',
        target: 'User',
        targetId: customer.id,
        oldValue: null,
        newValue: `@${customer.username}: ${message}`,
      },
    }),
  ]);

  revalidatePath(BASE);
  go(
    'notice',
    external?.sent
      ? `Notification created in the app and sent to @${customer.username}.`
      : `Notification created in the app for @${customer.username}. No WhatsApp, SMS or email was sent, because none is connected yet.`
  );
}
