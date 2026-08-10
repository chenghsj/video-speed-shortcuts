import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Kbd = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-full bg-muted px-1.5 font-sans text-[11px] font-normal leading-none text-muted-foreground',
        className
      )}
      {...props}
    />
  )
)

Kbd.displayName = 'Kbd'

export const KbdGroup = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="kbd-group"
      className={cn('inline-flex items-center gap-0.5', className)}
      {...props}
    />
  )
)

KbdGroup.displayName = 'KbdGroup'
