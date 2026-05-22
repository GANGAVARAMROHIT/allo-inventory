import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
import pg from 'pg'

// 1. Create a native Node.js pg Pool connected to your pooled DATABASE_URL
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// 2. Wrap it with the official Prisma v7 Adapter
const adapter = new PrismaPg(pool)

// 3. Pass the adapter to your Prisma Client constructor
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: 'Mumbai Hub', location: 'Mumbai, India' }
  })
  const delhi = await prisma.warehouse.create({
    data: { name: 'Delhi Hub', location: 'Delhi, India' }
  })

  // Create products
  const shirt = await prisma.product.create({
    data: { name: 'Classic Cotton Shirt', description: 'Comfortable everyday shirt' }
  })
  const shoes = await prisma.product.create({
    data: { name: 'Running Shoes', description: 'Lightweight running shoes' }
  })
  const watch = await prisma.product.create({
    data: { name: 'Smart Watch', description: 'Feature-packed smartwatch' }
  })

  // Create stock levels
  await prisma.stock.createMany({
    data: [
      { productId: shirt.id, warehouseId: mumbai.id, total: 10, reserved: 0 },
      { productId: shirt.id, warehouseId: delhi.id,  total: 5,  reserved: 0 },
      { productId: shoes.id, warehouseId: mumbai.id, total: 3,  reserved: 0 },
      { productId: shoes.id, warehouseId: delhi.id,  total: 8,  reserved: 0 },
      { productId: watch.id, warehouseId: mumbai.id, total: 1,  reserved: 0 },
      { productId: watch.id, warehouseId: delhi.id,  total: 2,  reserved: 0 },
    ]
  })

  console.log('✅ Database seeded!')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end() // Close the underlying pg connection pool cleanly
  })