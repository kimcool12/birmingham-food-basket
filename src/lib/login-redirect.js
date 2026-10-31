// Decides where a person goes after logging in.
// - Admins go to the admin dashboard.
// - Customers go to the shop.
// - If they were sent to the login page from a protected page, they return to that page,
//   but only if it is on this site and suits their role.

export function safePath(value) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.startsWith('/api')) return null;
  return value;
}

export function loginTarget(role, callbackUrl) {
  const isAdmin = role === 'ADMIN';
  const wanted = safePath(callbackUrl);
  const inAdminArea = wanted === '/admin' || wanted?.startsWith('/admin/');

  if (wanted && isAdmin && inAdminArea) return wanted;
  if (wanted && !isAdmin && !inAdminArea) return wanted;
  return isAdmin ? '/admin/dashboard' : '/shop';
}
