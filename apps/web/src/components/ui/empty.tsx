import type { VariantProps } from 'class-variance-authority'

import type { ComponentPropsWithoutRef, ElementType } from 'react'

import { cn } from '#/lib/utils'
import { cva } from 'class-variance-authority'

type EmptySlotProps<T extends ElementType> = {
  as?: T
  className?: string
  slot: string
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>

function EmptySlot<T extends ElementType = 'div'>({
  as,
  className,
  slot,
  ...props
}: EmptySlotProps<T>) {
  const Component = as ?? 'div'

  return <Component className={className} data-slot={slot} {...props} />
}

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <EmptySlot
      slot="empty"
      className={cn(
        'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-dashed p-12 text-center text-balance',
        className,
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <EmptySlot
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      slot="empty-header"
      {...props}
    />
  )
}

const emptyMediaDefaultVariants = {
  variant: 'default',
} as const

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: emptyMediaDefaultVariants,
  },
)

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <EmptySlot
      slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <EmptySlot
      className={cn('font-heading text-lg font-medium tracking-tight', className)}
      slot="empty-title"
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <EmptySlot
      as="div"
      slot="empty-description"
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <EmptySlot
      slot="empty-content"
      className={cn(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
