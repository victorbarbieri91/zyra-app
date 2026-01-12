// ============================================
// PÁGINA DO WIZARD DE MIGRAÇÃO POR MÓDULO
// ============================================

import { MigracaoWizard } from '@/components/migracao'
import { ModuloMigracao } from '@/types/migracao'
import { notFound } from 'next/navigation'

const MODULOS_VALIDOS: ModuloMigracao[] = ['crm', 'processos', 'consultivo', 'agenda', 'financeiro']

interface Props {
  params: Promise<{
    modulo: string
  }>
}

export default async function MigracaoModuloPage({ params }: Props) {
  const { modulo } = await params

  // Validar módulo
  if (!MODULOS_VALIDOS.includes(modulo as ModuloMigracao)) {
    notFound()
  }

  return (
    <div className="p-6">
      <MigracaoWizard modulo={modulo as ModuloMigracao} />
    </div>
  )
}

// Gerar páginas estáticas para cada módulo
export function generateStaticParams() {
  return MODULOS_VALIDOS.map(modulo => ({
    modulo
  }))
}
