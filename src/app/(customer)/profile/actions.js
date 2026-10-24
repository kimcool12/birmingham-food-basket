'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/permissions';

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;
const POSTCODE_RE = /^[A-Za-z0-9][A-Za-z0-9 ]{1,8}[A-Za-z0-9]$/;

function text(value) {
  return String(value ?? '').trim();
}

export async function saveProfile(prevState, formData) {
  const user = await requireUser();

  const values = {
    fullName: text(formData.get('fullName')),
    phone: text(formData.get('phone')),
    whatsapp: text(formData.get('whatsapp')),
    address: text(formData.get('address')),
    postcode: text(formData.get('postcode')).toUpperCase(),
  };

  const errors = {};
  if (values.fullName.length < 2 || values.fullName.length > 100) {
    errors.fullName = 'Enter your full name.';
  }
  if (!PHONE_RE.test(values.phone)) errors.phone = 'Enter a valid phone number.';
  if (values.whatsapp && !PHONE_RE.test(values.whatsapp)) {
    errors.whatsapp = 'Enter a valid WhatsApp number.';
  }
  if (values.address.length < 5 || values.address.length > 200) {
    errors.address = 'Enter your delivery address.';
  }
  if (!POSTCODE_RE.test(values.postcode)) errors.postcode = 'Enter a valid postcode.';

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values, message: 'Please fix the errors below.' };
  }

  try {
    await prisma.$transaction([
      prisma.customerProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          postcode: values.postcode,
        },
        create: {
          userId: user.id,
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          postcode: values.postcode,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { whatsapp: values.whatsapp || null },
      }),
    ]);
  } catch (error) {
    console.error('Save profile error:', error);
    return { ok: false, errors: {}, values, message: 'Unable to save your details. Please try again.' };
  }

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { ok: true, errors: {}, values, message: 'Your details have been saved.' };
}
