'use client'

/**
 * Componente de skeleton para loading states de paginas.
 * Usado em arquivos loading.tsx para mostrar um placeholder
 * enquanto a pagina carrega.
 */

interface PageSkeletonProps {
  /** Numero de cards de KPI no topo (0 para esconder) */
  kpiCards?: number
  /** Mostrar area de tabela/lista */
  showTable?: boolean
  /** Mostrar area de calendario */
  showCalendar?: boolean
  /** Numero de linhas na tabela */
  tableRows?: number
  /** Titulo da pagina (para header skeleton) */
  title?: string
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className || ''}`} />
  )
}

export function PageSkeleton({
  kpiCards = 4,
  showTable = true,
  showCalendar = false,
  tableRows = 6,
  title,
}: PageSkeletonProps) {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-2xl font-bold text-[#34495e]">{title}</h1>
          ) : (
            <SkeletonPulse className="h-8 w-48" />
          )}
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <div className="flex gap-2.5">
          <SkeletonPulse className="h-9 w-28 rounded-lg" />
          <SkeletonPulse className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      {kpiCards > 0 && (
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(kpiCards, 4)} gap-4`}>
          {Array.from({ length: kpiCards }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-8 w-8 rounded-lg" />
              </div>
              <SkeletonPulse className="h-7 w-16" />
              <SkeletonPulse className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Table/List Area */}
      {showTable && (
        <div className="bg-white rounded-xl border border-slate-200">
          {/* Table Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <SkeletonPulse className="h-5 w-32" />
            <div className="flex gap-2">
              <SkeletonPulse className="h-8 w-24 rounded-lg" />
              <SkeletonPulse className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-slate-50">
            {Array.from({ length: tableRows }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <SkeletonPulse className="h-4 w-4 rounded" />
                <SkeletonPulse className="h-4 flex-1 max-w-[200px]" />
                <SkeletonPulse className="h-4 w-24" />
                <SkeletonPulse className="h-6 w-16 rounded-full" />
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Area */}
      {showCalendar && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <SkeletonPulse className="h-5 w-32" />
            <div className="flex gap-2">
              <SkeletonPulse className="h-8 w-8 rounded" />
              <SkeletonPulse className="h-8 w-8 rounded" />
            </div>
          </div>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonPulse key={`header-${i}`} className="h-8 rounded" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <SkeletonPulse key={`cell-${i}`} className="h-20 rounded" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton simples para dashboard (cards + graficos + agenda)
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header com saudacao */}
      <div className="space-y-1">
        <SkeletonPulse className="h-7 w-64" />
        <SkeletonPulse className="h-4 w-96" />
      </div>

      {/* Alertas */}
      <SkeletonPulse className="h-24 w-full rounded-xl" />

      {/* KPI Cards - 4 colunas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-4 w-20" />
              <SkeletonPulse className="h-8 w-8 rounded-lg" />
            </div>
            <SkeletonPulse className="h-7 w-16" />
            <SkeletonPulse className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Meus Numeros + Agenda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <SkeletonPulse className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <SkeletonPulse className="h-4 w-28" />
              <SkeletonPulse className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <SkeletonPulse className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonPulse className="h-3 w-3 rounded-full" />
              <SkeletonPulse className="h-4 w-12" />
              <SkeletonPulse className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
