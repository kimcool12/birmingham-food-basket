'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../../../lib/prisma';
import { requireAdmin } from '../../../lib/permissions';
import { SETTING_KEYS } from '../../../lib/settings';

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

function text(value) {
  return String(value ?? '').trim();
}

export async function saveSettings(prevState, formData) {
  const admin = await requireAdmin();

  const values = {
    hero_heading: text(formData.get('hero_heading')),
    hero_text: text(formData.get('hero_text')),
    contact_whatsapp: text(formData.get('contact_whatsapp')),
    delivery_info: text(formData.get('delivery_info')),
  };

  const errors = {};
  if (values.hero_heading && (values.hero_heading.length < 2 || values.hero_heading.length > 80)) {
    errors.hero_heading = 'The heading must be 2 to 80 characters, or empty to use the standard one.';
  }
  if (values.hero_text.length > 300) errors.hero_text = 'The banner text must be 300 characters or fewer.';
  if (values.contact_whatsapp && !PHONE_RE.test(values.contact_whatsapp)) {
    errors.contact_whatsapp = 'Enter a valid phone number, for example +447000000000.';
  }
  if (values.delivery_info.length > 300) {
    errors.delivery_info = 'The delivery information must be 300 characters or fewer.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values, message: 'Please fix the errors below.' };
  }

  try {
    // What is stored now ('' when a setting was never saved), so only real changes are logged.
    const rows = await prisma.setting.findMany();
    const before = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const changed = SETTING_KEYS.filter((key) => (before[key] ?? '') !== values[key]);

    await prisma.$transaction([
      ...SETTING_KEYS.map((key) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: values[key] },
          create: { key, value: values[key] },
        })
      ),
      ...changed.map((key) =>
        prisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'SETTING_CHANGED',
            target: 'Setting',
            targetId: key,
            oldValue: (before[key] ?? '').slice(0, 300),
            newValue: values[key].slice(0, 300),
          },
        })
      ),
    ]);
  } catch (error) {
    console.error('Save settings error:', error);
    return { ok: false, errors: {}, values, message: 'Unable to save the settings. Please try again.' };
  }

  revalidatePath('/');
  revalidatePath('/admin/settings');
  return { ok: true, errors: {}, values, message: 'Settings saved.' };
}
