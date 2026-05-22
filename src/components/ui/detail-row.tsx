import { cn } from '@/lib/utils'

type DetailRowProps = {
  label: string
  value: React.ReactNode
  className?: string
}

export function DetailRow({ label, value, className }: DetailRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground sm:text-end">{value}</dd>
    </div>
  )
}
