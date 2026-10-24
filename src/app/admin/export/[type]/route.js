import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';
import { toCsv } from '../../../../lib/csv';
import {
  ordersExport,
  customersExport,
  productsExport,
  deliveriesExport,
} from '../../../../lib/exports';

const BUILDERS = {
  orders: ordersExport,
  customers: customersExport,
  products: productsExport,
  deliveries: deliveriesExport,
};

// Route handlers are not wrapped by the admin layout, so the admin check is done here.
async function getAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  return user?.role === 'ADMIN' ? user : null;
}

export async function GET(request, { params }) {
  const admin = await getAdmin();
  if (!admin) return new Response('You do not have permission to do this.', { status: 403 });

  const { type } = await params;
  const builder = BUILDERS[type];
  if (!builder) return new Response('Unknown export.', { status: 404 });

  try {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const result = await builder(prisma, query);
    if (result.error) return new Response(result.error, { status: 400 });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'EXPORT_CREATED',
        target: 'Export',
        targetId: type,
        oldValue: null,
        newValue: `${result.filename}: ${Math.max(0, result.rows.length - 1)} rows`,
      },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(toCsv(result.rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Unable to create the export. Please try again.', { status: 500 });
  }
}
