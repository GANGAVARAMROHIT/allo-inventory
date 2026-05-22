import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

const schema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { productId, warehouseId, quantity } = parsed.data

  // Redis lock key — one lock per product+warehouse combo
  const lockKey = `lock:${productId}:${warehouseId}`
  const lockValue = crypto.randomUUID()

  // Try to acquire lock (expires in 10 seconds)
  const acquired = await redis.set(lockKey, lockValue, {
    nx: true,   // only set if not exists
    ex: 10,     // expire in 10 seconds
  })

  if (!acquired) {
    return NextResponse.json(
      { error: 'Another reservation is in progress, please retry' },
      { status: 429 }
    )
  }

  try {
    // Check available stock
    const stock = await prisma.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } }
    })

    if (!stock || (stock.total - stock.reserved) < quantity) {
      return NextResponse.json(
        { error: 'Not enough stock available' },
        { status: 409 }
      )
    }

    // Reserve — increment reserved count and create reservation record
    const expiresAt = new Date(Date.now() + 20 * 1000) // 10 seconds

    const [reservation] = await prisma.$transaction([
      prisma.reservation.create({
        data: { productId, warehouseId, quantity, expiresAt, status: 'PENDING' }
      }),
      prisma.stock.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reserved: { increment: quantity } }
      })
    ])

    return NextResponse.json(reservation, { status: 201 })
  } finally {
    // Always release the lock
    const current = await redis.get(lockKey)
    if (current === lockValue) {
      await redis.del(lockKey)
    }
  }
}