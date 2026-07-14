import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  // DATABASE_URL is only needed for migrate commands, not for generate.
  // Set it in .env.local to the Supabase direct connection string (not pooled).
  datasource: process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : undefined,
});
