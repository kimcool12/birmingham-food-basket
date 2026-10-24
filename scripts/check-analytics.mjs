import { toCsv, csvCell } from '../src/lib/csv.js';
import {
  categoryOrders,
  dailySeries,
  postcodeArea,
  postcodeAreas,
  quantityTotals,
  summarise,
  topProducts,
  ukDay,
} from '../src/lib/analytics.js';

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

console.log('\n1. CSV cells');
check('plain text unchanged', csvCell('Beef') === 'Beef');
check('comma gets quoted', csvCell('Smith, John') === '"Smith, John"');
check('quote is doubled', csvCell('say "hi"') === '"say ""hi"""');
check('new line gets quoted', csvCell('a\nb') === '"a\nb"');
check('phone number with plus is kept', csvCell('+447000000000') === '+447000000000');
check('formula is neutralised', csvCell('=SUM(A1:A9)') === "'=SUM(A1:A9)");
check('at-sign formula is neutralised', csvCell('@cmd') === "'@cmd");
check('plus formula is neutralised', csvCell('+cmd|calc') === "'+cmd|calc");
check('minus text is neutralised', csvCell('-2+3+cmd') === "'-2+3+cmd");
check('numbers are kept', csvCell(-12.5) === '-12.5' && csvCell(0) === '0');
check('empty values are blank', csvCell(null) === '' && csvCell(undefined) === '');

console.log('\n2. CSV file');
const csv = toCsv([['A', 'B'], ['x', 'y, z']]);
check('starts with the UTF-8 mark', csv.startsWith('\uFEFF'));
check('uses Windows line breaks', csv.includes('\r\n'));
check('rows are right', csv === '\uFEFFA,B\r\nx,"y, z"\r\n');

console.log('\n3. UK day grouping');
check('11pm UTC in summer is already the next UK day', ukDay(new Date('2026-07-01T23:30:00Z')) === '2026-07-02');
check('11pm UTC in winter is the same UK day', ukDay(new Date('2026-01-15T23:30:00Z')) === '2026-01-15');

console.log('\n4. Daily series fills empty days');
const orders = [
  { createdAt: new Date('2026-10-01T10:00:00Z'), userId: 'a', total: '324.00', postcode: 'B1 1AA' },
  { createdAt: new Date('2026-10-01T15:00:00Z'), userId: 'b', total: '10.50', postcode: 'B15 2TT' },
  { createdAt: new Date('2026-10-03T09:00:00Z'), userId: 'a', total: '5.25', postcode: 'b1 1ab' },
];
const series = dailySeries(orders, '2026-10-01', 4);
check('4 days', series.length === 4);
check('counts are 2, 0, 1, 0', series.map((s) => s.orders).join(',') === '2,0,1,0', series.map((s) => s.orders).join(','));
check('label is short', series[0].label === '1 Oct', series[0].label);

console.log('\n5. Summary uses exact money maths');
const s = summarise(orders);
check('3 orders, 2 customers', s.orders === 3 && s.customers === 2);
check('value is 33975 pence', s.valuePence === 33975, String(s.valuePence));
check('average rounds to 11325 pence', s.averagePence === 11325, String(s.averagePence));
check('empty list gives zeros', summarise([]).averagePence === 0);

console.log('\n6. Postcode areas keep only the area');
check('B1 1AA -> B1', postcodeArea('B1 1AA') === 'B1');
check('B15 2TT -> B15', postcodeArea('b15 2tt') === 'B15');
check('SW1A 1AA -> SW1A', postcodeArea('SW1A 1AA') === 'SW1A');
check('empty -> Unknown', postcodeArea('') === 'Unknown');
const areas = postcodeAreas(orders);
check('B1 has 2 orders and 1 customer', areas[0].area === 'B1' && areas[0].orders === 2 && areas[0].customers === 1);

console.log('\n7. Products and units');
const items = [
  { orderId: 'o1', productNameSnapshot: 'Beef (Shin)', unit: 'KG', quantity: '30.00', product: { category: { name: 'Meat' } } },
  { orderId: 'o2', productNameSnapshot: 'Beef (Shin)', unit: 'KG', quantity: '20.00', product: { category: { name: 'Meat' } } },
  { orderId: 'o3', productNameSnapshot: 'Beef (Shin)', unit: 'KG', quantity: '15.00', product: { category: { name: 'Meat' } } },
  { orderId: 'o1', productNameSnapshot: 'Box of Tomatoes', unit: 'box', quantity: '2.00', product: { category: { name: 'Vegetable Items' } } },
  { orderId: 'o1', productNameSnapshot: 'Chicken Wings', unit: 'KG', quantity: '1.10', product: { category: { name: 'Poultry' } } },
  { orderId: 'o2', productNameSnapshot: 'Chicken Wings', unit: 'KG', quantity: '2.20', product: { category: { name: 'Poultry' } } },
];
const totals = quantityTotals(items);
const beef = totals.find((t) => t.name === 'Beef (Shin)');
check('Beef adds up to 65 KG', beef.total === 65 && beef.unit === 'KG');
check('Chicken 1.10 + 2.20 = 3.3', totals.find((t) => t.name === 'Chicken Wings').total === 3.3);
check('biggest total first', totals[0].name === 'Beef (Shin)');
const top = topProducts(items, 2);
check('beef is in 3 orders, the most', top[0].name === 'Beef (Shin)' && top[0].orders === 3);
check('limit is respected', top.length === 2);
const cats = categoryOrders(items);
check('Meat appears in 3 orders', cats[0].name === 'Meat' && cats[0].orders === 3);
check('same unit different name stay apart', totals.length === 3);

console.log(failures === 0 ? '\nRESULT: all checks passed.' : `\nRESULT: ${failures} check(s) FAILED.`);
if (failures > 0) process.exitCode = 1;
