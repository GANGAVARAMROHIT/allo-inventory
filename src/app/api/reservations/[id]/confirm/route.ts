import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Reservation is no longer pending' },
      { status: 400 }
    )
  }

  if (new Date() > reservation.expiresAt) {
    // Auto-release expired reservation
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'RELEASED' }
      }),
      prisma.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId
          }
        },
        data: { reserved: { decrement: reservation.quantity } }
      })
    ])

    return NextResponse.json(
      { error: 'Reservation has expired' },
      { status: 410 }
    )
  }

  // Confirm — decrement both total and reserved
  const updated = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    })
    await tx.stock.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId
        }
      },
      data: {
        total: { decrement: reservation.quantity },
        reserved: { decrement: reservation.quantity }
      }
    })
    return confirmed
  })

  return NextResponse.json(updated)
}