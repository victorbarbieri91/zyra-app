'use client'

import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary'

export default function AgendaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ModuleErrorBoundary error={error} reset={reset} moduleName="Agenda" />
}
