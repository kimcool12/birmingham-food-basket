import { SETTING_DEFAULTS, getSettings, mergeSettings } from '../src/lib/settings.js';
import { orderMessages, whatsappDigits, whatsappLink } from '../src/lib/whatsapp.js';

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

console.log('\n1. Settings fall back to the standard wording');
const empty = mergeSettings([]);
check('no rows gives the defaults', empty.hero_heading === SETTING_DEFAULTS.hero_heading);
const custom = mergeSettings([
  { key: 'hero_heading', value: '  Fresh every week  ' },
  { key: 'hero_text', value: '   ' },
  { key: 'something_else', value: 'ignored' },
  { key: 'delivery_info', value: 'We deliver on Fridays.' },
]);
check('a saved heading is used and trimmed', custom.hero_heading === 'Fresh every week');
check('a blank value keeps the standard text', custom.hero_text === SETTING_DEFAULTS.hero_text);
check('unknown keys are ignored', !('something_else' in custom));
check('delivery information is used', custom.delivery_info === 'We deliver on Fridays.');

console.log('\n2. Reading settings never breaks the page');
const goodDb = { setting: { findMany: async () => [{ key: 'contact_whatsapp', value: '+447000000000' }] } };
check('reads from the database', (await getSettings(goodDb)).contact_whatsapp === '+447000000000');
const brokenDb = { setting: { findMany: async () => { throw new Error('table missing'); } } };
const originalError = console.error;
console.error = () => {};
const fallback = await getSettings(brokenDb);
console.error = originalError;
check('a database error returns the defaults', fallback.hero_heading === SETTING_DEFAULTS.hero_heading);
check('no settings table at all returns the defaults', (await (async () => {
  console.error = () => {};
  const r = await getSettings({});
  console.error = originalError;
  return r;
})()).hero_heading === SETTING_DEFAULTS.hero_heading);

console.log('\n3. WhatsApp numbers');
check('+44 number keeps its country code', whatsappDigits('+44 7000 000000') === '447000000000');
check('UK number starting 0 becomes 44', whatsappDigits('07123 456789') === '447123456789');
check('00 prefix is removed', whatsappDigits('0044 7123 456789') === '447123456789');
check('other country with + is kept', whatsappDigits('+231 555 555 5555') === '2315555555555');
check('empty gives empty', whatsappDigits('') === '' && whatsappDigits(null) === '');
check('letters are ignored', whatsappDigits('abc') === '');

console.log('\n4. WhatsApp links');
check('too short gives no link', whatsappLink('12345', 'hi') === null);
check('valid link', whatsappLink('+447000000000', '') === 'https://wa.me/447000000000');
const link = whatsappLink('07000 000000', 'Hello & welcome #12');
check('message is URL encoded', link === 'https://wa.me/447000000000?text=Hello%20%26%20welcome%20%2312', link);

console.log('\n5. Ready-made messages');
const order = { fullName: 'Ada Lovelace', orderNumber: 14 };
const noDate = orderMessages(order, null);
check('two messages without a date', noDate.length === 2);
check('uses the first name', noDate[0].text.startsWith('Hello Ada,'));
check('includes the order number', noDate.every((m) => m.text.includes('#14')));
const withDate = orderMessages(order, { deliveryDate: new Date('2026-11-01T00:00:00Z'), deliveryTime: 'Between 2pm and 4pm' });
check('scheduled message is added with a date', withDate.length === 3 && withDate[1].key === 'scheduled');
check('scheduled message has the date and time', withDate[1].text.includes('1 Nov 2026') && withDate[1].text.includes('Between 2pm and 4pm'), withDate[1].text);
check('missing name falls back to "there"', orderMessages({ fullName: '', orderNumber: 1 }, null)[0].text.startsWith('Hello there,'));

console.log(failures === 0 ? '\nRESULT: all checks passed.' : `\nRESULT: ${failures} check(s) FAILED.`);
if (failures > 0) process.exitCode = 1;
