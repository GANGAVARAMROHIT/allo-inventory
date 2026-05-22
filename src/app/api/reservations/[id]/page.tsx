'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Reservation = {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  product: { name: string }
  warehouse: { name: string }
}

function useCountdown(expiresAt: string) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return { secondsLeft, display: `${mins}:${secs.toString().padStart(2, '0')}` }
}

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchReservation = useCallback(async () => {
    const res = await fetch(`/api/reservations/${id}/details`)
    if (res.ok) {
      const data = await res.json()
      setReservation(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchReservation()
  }, [fetchReservation])

  const { secondsLeft, display } = useCountdown(reservation?.expiresAt ?? new Date().toISOString())

  async function handleConfirm() {
    setActionLoading(true)
    setError(null)
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to confirm')
    } else {
      setMessage('✅ Purchase confirmed! Thank you.')
      setReservation(prev => prev ? { ...prev, status: 'CONFIRMED' } : prev)
    }
    setActionLoading(false)
  }

  async function handleCancel() {
    setActionLoading(true)
    setError(null)
    const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to cancel')
    } else {
      setMessage('Reservation cancelled. Redirecting...')
      setTimeout(() => router.push('/'), 2000)
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading reservation...</p>
      </main>
    )
  }

  if (!reservation) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">Reservation not found.</p>
      </main>
    )
  }

  const isExpired = secondsLeft === 0 && reservation.status === 'PENDING'
  const isPending = reservation.status === 'PENDING' && !isExpired

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <Card className="shadow-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Reservation Details</CardTitle>
              <Badge
                variant={
                  reservation.status === 'CONFIRMED' ? 'default' :
                  reservation.status === 'RELEASED' ? 'secondary' :
                  isExpired ? 'destructive' : 'outline'
                }
              >
                {isExpired ? 'EXPIRED' : reservation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Product</span>
              <span className="font-medium">{reservation.product.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Warehouse</span>
              <span className="font-medium">{reservation.warehouse.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantity</span>
              <span className="font-medium">{reservation.quantity}</span>
            </div>

            {isPending && (
              <div className={`mt-4 rounded-lg p-4 text-center ${secondsLeft < 60 ? 'bg-red-50' : 'bg-amber-50'}`}>
                <p className="text-sm text-gray-500 mb-1">Time remaining to complete purchase</p>
                <p className={`text-4xl font-bold font-mono ${secondsLeft < 60 ? 'text-red-600' : 'text-amber-600'}`}>
                  {display}
                </p>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 bg-red-50 rounded-lg p-4 text-center">
                <p className="text-red-600 font-medium">⏱ Your reservation has expired</p>
                <p className="text-sm text-gray-500 mt-1">The hold on this item has been released</p>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {isPending && (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm Purchase'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancel
            </Button>
          </div>
        )}

        {(reservation.status === 'CONFIRMED' || reservation.status === 'RELEASED') && (
          <Button className="w-full" onClick={() => router.push('/')}>
            Back to Products
          </Button>
        )}
      </div>
    </main>
  )
}