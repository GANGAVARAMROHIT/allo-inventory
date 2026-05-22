import { withIdempotency } from '@/lib/idempotency'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  return withIdempotency(req, async () => {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { productId, warehouseId, quantity } = parsed.data

    const lockKey = `lock:${productId}:${warehouseId}`
    const lockValue = crypto.randomUUID()

    const acquired = await redis.set(lockKey, lockValue, {
      nx: true,
      ex: 10,
    })

    if (!acquired) {
      return NextResponse.json(
        { error: 'Another reservation is in progress, please retry' },
        { status: 429 }
      )
    }

    try {
      const stock = await prisma.stock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } }
      })

      if (!stock || (stock.total - stock.reserved) < quantity) {
        return NextResponse.json(
          { error: 'Not enough stock available' },
          { status: 409 }
        )
      }

      const expiresAt = new Date(Date.now() + 20 * 1000)

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
      const current = await redis.get(lockKey)
      if (current === lockValue) {
        await redis.del(lockKey)
      }
    }
  })
}