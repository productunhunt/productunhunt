import { defineConfig } from 'drizzle-kit';

// Read straight from `process.env` rather than `astro:env/server`: drizzle-kit
// is a standalone CLI and never runs inside an Astro build.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
