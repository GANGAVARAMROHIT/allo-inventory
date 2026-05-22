'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageOpen } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/layout/page-header'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WarehouseStockRow } from '@/components/product/warehouse-stock-row'

type StockEntry = {
  warehouseId: string
  warehouseName: string
  location: string
  available: number
}

type Product = {
  id: string
  name: string
  description: string
  stock: StockEntry[]
}

function ProductsLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading products">
      {[1, 2].map(i => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-[4.5rem] w-full" />
            <Skeleton className="h-[4.5rem] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  async function handleReserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`)
    setError(null)

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setReserving(null)
      return
    }

    router.push(`/reservation/${data.id}`)
  }

  return (
    <AppShell maxWidth="xl">
      <PageHeader
        title="Products"
        description="Browse available stock and reserve items from any warehouse before checkout."
      />

      {error && (
        <AlertBanner variant="error" className="mb-6">
          {error}
        </AlertBanner>
      )}

      {loading ? (
        <ProductsLoadingSkeleton />
      ) : products.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
          role="status"
        >
          <PackageOpen className="mb-4 size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">No products available</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Check back later or contact your administrator to add inventory.
          </p>
        </div>
      ) : (
        <ul className="grid list-none gap-6 p-0" role="list">
          {products.map(product => (
            <li key={product.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid list-none gap-3 p-0" role="list" aria-label={`Stock for ${product.name}`}>
                    {product.stock.map(s => {
                      const reserveKey = `${product.id}-${s.warehouseId}`
                      return (
                        <li key={s.warehouseId}>
                          <WarehouseStockRow
                            warehouseName={s.warehouseName}
                            location={s.location}
                            available={s.available}
                            isReserving={reserving === reserveKey}
                            disabled={
                              s.available === 0 || reserving === reserveKey
                            }
                            onReserve={() => handleReserve(product.id, s.warehouseId)}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
