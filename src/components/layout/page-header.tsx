import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  className?: string
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-8 sm:mb-10', className)}>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </header>
  )
}
