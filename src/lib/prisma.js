// src/lib/prisma.js
// Prisma 7 requires a driver adapter — the DATABASE_URL is passed to pg Pool,
// not read directly from the schema's datasource block.
// A global singleton prevents multiple PrismaClient instances during Next.js
// hot-reload in development.

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// In development Next.js hot-reloads modules, which would create a new
// PrismaClient on every reload and exhaust the connection pool.
// Storing the instance on globalThis avoids that.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
