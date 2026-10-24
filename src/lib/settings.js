// Site settings that the admin can change without touching code.
// A blank value means "use the standard wording".

export const SETTING_DEFAULTS = {
  hero_heading: 'Birmingham Food Basket',
  hero_text:
    'Order vegetables, meat, poultry, fish and groceries in wholesale and retail quantities.',
  contact_whatsapp: '',
  delivery_info: '',
};

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS);

export function mergeSettings(rows) {
  const values = { ...SETTING_DEFAULTS };
  for (const row of rows ?? []) {
    if (SETTING_KEYS.includes(row.key) && typeof row.value === 'string' && row.value.trim()) {
      values[row.key] = row.value.trim();
    }
  }
  return values;
}

// If the settings table is missing or the database is unreachable, the site keeps working
// with the standard wording instead of showing an error.
export async function getSettings(db) {
  try {
    const rows = await db.setting.findMany();
    return mergeSettings(rows);
  } catch (error) {
    console.error('Reading settings failed:', error.message);
    return { ...SETTING_DEFAULTS };
  }
}
