import { MapPin, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type WarehouseStockRowProps = {
  warehouseName: string
  location: string
  available: number
  isReserving: boolean
  disabled: boolean
  onReserve: () => void
}

export function WarehouseStockRow({
  warehouseName,
  location,
  available,
  isReserving,
  disabled,
  onReserve,
}: WarehouseStockRowProps) {
  const inStock = available > 0

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between',
        !inStock && 'opacity-75'
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">{warehouseName}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span>{location}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
        <Badge
          variant={inStock ? 'secondary' : 'destructive'}
          className={cn(inStock && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}
        >
          {inStock ? `${available} available` : 'Out of stock'}
        </Badge>
        <Button
          size="sm"
          className="min-w-[6.5rem]"
          disabled={disabled}
          onClick={onReserve}
          aria-busy={isReserving}
        >
          {isReserving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Reserving…
            </>
          ) : (
            'Reserve'
          )}
        </Button>
      </div>
    </div>
  )
}
