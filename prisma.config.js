// prisma.config.js -- Prisma 7 configuration file
// Source: https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
//
// - datasource.url uses env() from "prisma/config" to read DATABASE_URL
// - No adapter() function here; the adapter belongs in src/lib/prisma.js
// - No earlyAccess flag
// - migrations.seed runs via: npx prisma db seed

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
