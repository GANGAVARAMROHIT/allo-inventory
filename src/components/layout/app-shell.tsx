import Link from 'next/link'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

type AppShellProps = {
  children: React.ReactNode
  className?: string
  maxWidth?: 'lg' | 'xl' | '2xl'
}

const maxWidthClass = {
  lg: 'max-w-lg',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
} as const

export function AppShell({
  children,
  className,
  maxWidth = 'xl',
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div
          className={cn(
            'mx-auto flex h-14 w-full items-center gap-3 px-4 sm:px-6 lg:px-8',
            maxWidthClass[maxWidth]
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Allo Inventory home"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Package className="size-4" aria-hidden />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight sm:text-base">
              Allo Inventory
            </span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          'mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8',
          maxWidthClass[maxWidth],
          className
        )}
      >
        {children}
      </main>

      <footer className="border-t border-border/60 py-6">
        <div
          className={cn(
            'mx-auto px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8',
            maxWidthClass[maxWidth]
          )}
        >
          Reserve stock across warehouses before checkout
        </div>
      </footer>
    </div>
  )
}
