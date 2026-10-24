import Link from 'next/link';
import prisma from '../../../lib/prisma';
import { requireAdmin } from '../../../lib/permissions';
import { isDate, addDays, londonDayStart } from '../../../lib/aggregate';
import { formatDateTime } from '../../../lib/order-status';
import styles from './audit-logs.module.scss';

export const metadata = { title: 'Audit Logs | Admin' };

const PAGE_SIZE = 30;
const like = (value) => ({ contains: value, mode: 'insensitive' });

function label(action) {
  const words = action.toLowerCase().split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : '';
}

export default async function AuditLogsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const action = String(sp.action ?? '');
  const adminId = String(sp.admin ?? '');
  const q = String(sp.q ?? '').trim();
  const from = isDate(sp.from) ? sp.from : '';
  const to = isDate(sp.to) ? sp.to : '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const and = [];
  if (action) and.push({ action });
  if (adminId) and.push({ adminId });
  if (from) and.push({ createdAt: { gte: londonDayStart(from) } });
  if (to) and.push({ createdAt: { lt: londonDayStart(addDays(to, 1)) } });
  if (q) {
    and.push({
      OR: [
        { oldValue: like(q) },
        { newValue: like(q) },
        { target: like(q) },
        { action: like(q) },
      ],
    });
  }
  const where = and.length > 0 ? { AND: and } : {};

  const [total, logs, actions, admins] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { admin: { select: { username: true } } },
    }),
    prisma.adminAuditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, username: true },
      orderBy: { username: 'asc' },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { action, admin: adminId, q, from, to };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Audit Logs</h1>
      <p className={styles.hint}>
        Every important admin action is recorded here. Passwords and secrets are never stored in the log.
      </p>

      <form method="get" className={styles.filters} role="search">
        <label className={styles.field}>
          Action
          <select name="action" defaultValue={action}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {label(a.action)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Admin
          <select name="admin" defaultValue={adminId}>
            <option value="">All admins</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.username}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          From
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label className={styles.field}>
          To
          <input type="date" name="to" defaultValue={to} />
        </label>
        <label className={styles.field}>
          Search
          <input type="search" name="q" defaultValue={q} placeholder="Product, order, change" />
        </label>
        <button type="submit">Filter</button>
        <Link href="/admin/audit-logs" className={styles.btn}>
          Clear
        </Link>
      </form>

      <p className={styles.count} role="status">
        {total} entr{total === 1 ? 'y' : 'ies'}
      </p>

      {logs.length === 0 ? (
        <p className={styles.empty}>No audit entries found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.nowrap}>{formatDateTime(log.createdAt)}</td>
                  <td>@{log.admin.username}</td>
                  <td>{label(log.action)}</td>
                  <td>
                    {log.target}
                    <span className={styles.small}>{log.targetId.slice(0, 8)}</span>
                  </td>
                  <td className={styles.change}>
                    {log.oldValue && log.newValue ? (
                      <>
                        {log.oldValue} <span aria-label="changed to">→</span> {log.newValue}
                      </>
                    ) : (
                      log.newValue || log.oldValue || '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          {page > 1 && (
            <Link href={`/admin/audit-logs${buildQuery(filters, { page: page - 1 })}`} className={styles.btn}>
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/admin/audit-logs${buildQuery(filters, { page: page + 1 })}`} className={styles.btn}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
