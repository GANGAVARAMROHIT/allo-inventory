import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Auto-cleanup: Release expired PENDING reservations
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() }
    }
  })

  // Decrement reserved count and mark as RELEASED
  for (const reservation of expiredReservations) {
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' }
      }),
      prisma.stock.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: { reserved: { decrement: reservation.quantity } }
      })
    ])
  }

  const products = await prisma.product.findMany({
    include: {
      stock: {
        include: { warehouse: true }
      }
    }
  })

  const result = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    stock: p.stock.map(s => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      location: s.warehouse.location,
      available: s.total - s.reserved,
      total: s.total,
    }))
  }))

  return NextResponse.json(result)
}