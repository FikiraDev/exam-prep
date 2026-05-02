import type { VariantProps } from 'class-variance-authority'

import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'
import { cva } from 'class-variance-authority'

const fieldDefaultVariants = {
  orientation: 'vertical',
} as const

const fieldVariants = cva('flex w-full gap-3 data-[invalid=true]:text-destructive', {
  variants: {
    orientation: {
      vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      responsive:
        'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
    },
  },
  defaultVariants: fieldDefaultVariants,
})

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:bg-input/30 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border *:data-[slot=field]:p-4',
        className,
      )}
      {...props}
    />
  )
}

type FieldErrorItem = { message?: string } | undefined

function getUniqueFieldErrors(errors: FieldErrorItem[]) {
  return [...new Map(errors.map((error) => [error?.message, error])).values()]
}

function renderErrorList(errors: FieldErrorItem[]) {
  return (
    <ul className="ml-4 flex list-disc flex-col gap-1">
      {errors.map((error) =>
        error?.message ? <li key={error.message}>{error.message}</li> : null,
      )}
    </ul>
  )
}

function renderUniqueFieldErrors(errors: FieldErrorItem[]) {
  if (errors.length === 0) {
    return null
  }

  if (errors.length === 1) {
    return errors[0]?.message
  }

  return renderErrorList(errors)
}

function renderFieldErrorContent(children: React.ReactNode, errors?: FieldErrorItem[]) {
  if (children) {
    return children
  }

  return renderUniqueFieldErrors(errors?.length ? getUniqueFieldErrors(errors) : [])
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: FieldErrorItem[]
}) {
  const content = renderFieldErrorContent(children, errors)

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm font-normal text-destructive', className)}
      {...props}
    >
      {content}
    </div>
  )
}

export { Field, FieldError, FieldLabel }
