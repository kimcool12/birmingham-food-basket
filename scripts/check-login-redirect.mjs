import { loginTarget, safePath } from '../src/lib/login-redirect.js';

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

console.log('\n1. Admins');
check('admin with no callback goes to the dashboard', loginTarget('ADMIN', null) === '/admin/dashboard');
check('admin returns to the admin page they wanted', loginTarget('ADMIN', '/admin/orders') === '/admin/orders');
check('admin asking for a customer page still lands on the dashboard', loginTarget('ADMIN', '/orders') === '/admin/dashboard');

console.log('\n2. Customers');
check('customer with no callback goes to the shop', loginTarget('CUSTOMER', null) === '/shop');
check('customer returns to the page they wanted', loginTarget('CUSTOMER', '/orders') === '/orders');
check('customer asking for admin goes to the shop', loginTarget('CUSTOMER', '/admin/dashboard') === '/shop');
check('unknown role is treated as a customer', loginTarget(undefined, null) === '/shop');

console.log('\n3. Unsafe addresses are ignored');
check('other website', loginTarget('CUSTOMER', 'https://evil.example') === '/shop');
check('double slash', loginTarget('CUSTOMER', '//evil.example') === '/shop');
check('backslash trick', loginTarget('CUSTOMER', '/\\evil.example') === '/shop');
check('api address', loginTarget('CUSTOMER', '/api/auth/signout') === '/shop');
check('not a string', safePath(42) === null && safePath(null) === null);
check('admin with unsafe address still gets the dashboard', loginTarget('ADMIN', 'https://evil.example') === '/admin/dashboard');
check('/administrator is not the admin area', loginTarget('CUSTOMER', '/administrator') === '/administrator');

console.log(failures === 0 ? '\nRESULT: all checks passed.' : `\nRESULT: ${failures} check(s) FAILED.`);
if (failures > 0) process.exitCode = 1;
