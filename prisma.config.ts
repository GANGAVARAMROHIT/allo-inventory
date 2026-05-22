import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  datasource: {
    url: process.env.DIRECT_URL, // Used by the CLI
  },

  migrations: {
    // Tells Prisma CLI how to run your seed file using Node
    seed: 'npx tsx prisma/seed.ts', 
  },
})