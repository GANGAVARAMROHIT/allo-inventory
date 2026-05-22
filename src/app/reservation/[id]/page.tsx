'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/layout/page-header'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailRow } from '@/components/ui/detail-row'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      )
      setSecondsLeft(diff)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return {
    secondsLeft,
    display: `${mins}:${secs.toString().padStart(2, '0')}`,
  }
}

function statusBadgeVariant(
  status: Reservation['status'],
  isExpired: boolean
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (isExpired) return 'destructive'
  if (status === 'CONFIRMED') return 'default'
  if (status === 'RELEASED') return 'secondary'
  return 'outline'
}

function ReservationLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading reservation">
      <Skeleton className="h-8 w-40" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  )
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

  const { secondsLeft, display } = useCountdown(
    reservation?.expiresAt ?? new Date().toISOString()
  )

  async function handleConfirm() {
    setActionLoading(true)
    setError(null)
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to confirm')
    } else {
      setMessage('Purchase confirmed. Thank you!')
      setReservation(prev => (prev ? { ...prev, status: 'CONFIRMED' } : prev))
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
      setMessage('Reservation cancelled. Redirecting…')
      setTimeout(() => router.push('/'), 2000)
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <AppShell maxWidth="lg">
        <ReservationLoadingSkeleton />
      </AppShell>
    )
  }

  if (!reservation) {
    return (
      <AppShell maxWidth="lg">
        <div className="flex flex-col items-center py-16 text-center" role="alert">
          <p className="font-medium text-destructive">Reservation not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This link may be invalid or the reservation was removed.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to products
          </Button>
        </div>
      </AppShell>
    )
  }

  const isExpired = secondsLeft === 0 && reservation.status === 'PENDING'
  const isPending = reservation.status === 'PENDING' && !isExpired
  const isUrgent = isPending && secondsLeft < 60

  return (
    <AppShell maxWidth="lg">
      <PageHeader
        title="Checkout"
        description="Complete your purchase before the reservation expires."
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Reservation details</CardTitle>
          <Badge variant={statusBadgeVariant(reservation.status, isExpired)}>
            {isExpired ? 'Expired' : reservation.status.toLowerCase()}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border/60">
            <DetailRow label="Product" value={reservation.product.name} />
            <DetailRow label="Warehouse" value={reservation.warehouse.name} />
            <DetailRow label="Quantity" value={reservation.quantity} />
          </dl>

          {isPending && (
            <div
              className={cn(
                'mt-6 rounded-xl border p-5 text-center',
                isUrgent
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              )}
              role="timer"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Time remaining: ${display}`}
            >
              <p className="mb-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                Time remaining to complete purchase
              </p>
              <p
                className={cn(
                  'font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl',
                  isUrgent ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
                )}
              >
                {display}
              </p>
            </div>
          )}

          {isExpired && (
            <div
              className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center"
              role="status"
            >
              <p className="font-medium text-destructive">Your reservation has expired</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The hold on this item has been released.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      )}

      {message && (
        <AlertBanner variant="success" className="mb-4">
          {message}
        </AlertBanner>
      )}

      {isPending && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1"
            size="lg"
            onClick={handleConfirm}
            disabled={actionLoading}
            aria-busy={actionLoading}
          >
            {actionLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              'Confirm purchase'
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            size="lg"
            onClick={handleCancel}
            disabled={actionLoading}
          >
            Cancel reservation
          </Button>
        </div>
      )}

      {(reservation.status === 'CONFIRMED' || reservation.status === 'RELEASED') && (
        <Button className="w-full" size="lg" variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to products
        </Button>
      )}
    </AppShell>
  )
}
