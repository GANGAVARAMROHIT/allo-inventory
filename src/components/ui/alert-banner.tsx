import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertBannerProps = {
  variant: 'error' | 'success'
  children: React.ReactNode
  className?: string
}

const variantStyles = {
  error:
    'border-destructive/25 bg-destructive/5 text-destructive dark:bg-destructive/10',
  success:
    'border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300',
} as const

export function AlertBanner({ variant, children, className }: AlertBannerProps) {
  const Icon = variant === 'error' ? AlertCircle : CheckCircle2

  return (
    <div
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        variantStyles[variant],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  )
}
