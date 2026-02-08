'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useIsMobile } from '@/hooks/useIsMobile'

// Desktop: standard dialog. Mobile: vaul bottom sheet drawer.

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer.Root>
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  )
}

function ResponsiveDialogTrigger({ children, ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <Drawer.Trigger {...props}>{children}</Drawer.Trigger>
  }

  return <DialogPrimitive.Trigger {...props}>{children}</DialogPrimitive.Trigger>
}

function ResponsiveDialogClose({ children, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <Drawer.Close {...props}>{children}</Drawer.Close>
  }

  return <DialogPrimitive.Close {...props}>{children}</DialogPrimitive.Close>
}

const ResponsiveDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          ref={ref}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white max-h-[90vh]',
            className
          )}
          {...(props as any)}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-slate-300" />
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    )
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
ResponsiveDialogContent.displayName = 'ResponsiveDialogContent'

function ResponsiveDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
  )
}

function ResponsiveDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4', className)} {...props} />
  )
}

function ResponsiveDialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer.Title
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...(props as any)}
      />
    )
  }

  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function ResponsiveDialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer.Description
        className={cn('text-sm text-muted-foreground', className)}
        {...(props as any)}
      />
    )
  }

  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
