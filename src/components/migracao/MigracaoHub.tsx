// ============================================
// HUB PRINCIPAL DE MIGRAÇÃO
// ============================================

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Scale,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Lock,
  ArrowRight,
  Upload,
  History
} from 'lucide-react'
import Link from 'next/link'
import { useMigracaoHistorico } from '@/hooks/useMigracaoHistorico'
import { MODULOS_CONFIG } from '@/lib/migracao/constants'
import { ModuloMigracao } from '@/types/migracao'

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Scale,
  FileText,
  Calendar,
  DollarSign
}

export function MigracaoHub() {
  const { modulosMigrados, getContagemModulo, isLoading } = useMigracaoHistorico()

  const getStatusModulo = (modulo: typeof MODULOS_CONFIG[0]) => {
    const migrado = modulosMigrados.includes(modulo.id)
    const dependenciasOk = modulo.dependencias.every(d => modulosMigrados.includes(d))

    if (migrado) return 'migrado'
    if (!dependenciasOk) return 'bloqueado'
    return 'disponivel'
  }

  const getDependenciasNomes = (deps: ModuloMigracao[]) => {
    return deps
      .map(d => MODULOS_CONFIG.find(m => m.id === d)?.nome)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Migração de Dados</h1>
          <p className="text-sm text-[#46627f] mt-1">
            Importe dados do seu sistema anterior para o Zyra Legal
          </p>
        </div>
        <Link href="/dashboard/migracao/historico">
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </Link>
      </div>

      {/* Aviso de ordem */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Ordem recomendada:</strong> Migre primeiro o CRM (clientes),
          pois os outros módulos dependem dessas informações para vincular processos,
          consultas e financeiro aos clientes corretos.
        </p>
      </div>

      {/* Lista de módulos */}
      <div className="grid gap-4">
        {MODULOS_CONFIG.map((modulo, index) => {
          const status = getStatusModulo(modulo)
          const Icone = iconMap[modulo.icone] || Upload
          const contagem = getContagemModulo(modulo.id)

          return (
            <Card
              key={modulo.id}
              className={`transition-all ${
                status === 'bloqueado'
                  ? 'opacity-60 bg-slate-50'
                  : status === 'migrado'
                  ? 'border-green-200 bg-green-50/30'
                  : 'hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Número do passo */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${status === 'migrado' ? 'bg-green-500 text-white' :
                        status === 'disponivel' ? 'bg-blue-500 text-white' :
                        'bg-slate-200 text-slate-500'}
                    `}>
                      {status === 'migrado' ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>

                    {/* Ícone do módulo */}
                    <div className={`w-10 h-10 rounded-lg ${modulo.cor} flex items-center justify-center`}>
                      <Icone className="w-5 h-5 text-white" />
                    </div>

                    {/* Info do módulo */}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {modulo.nome}

                        {status === 'migrado' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            {contagem} registros
                          </Badge>
                        )}

                        {status === 'bloqueado' && (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {modulo.descricao}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Botão de ação */}
                  <div>
                    {status === 'disponivel' && (
                      <Link href={`/dashboard/migracao/${modulo.id}`}>
                        <Button>
                          Iniciar Migração
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}

                    {status === 'migrado' && (
                      <Link href={`/dashboard/migracao/${modulo.id}`}>
                        <Button variant="outline">
                          Migrar Novamente
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Dependências */}
              {status === 'bloqueado' && modulo.dependencias.length > 0 && (
                <CardContent className="pt-0 pb-4">
                  <p className="text-xs text-slate-500">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Requer migração de: {getDependenciasNomes(modulo.dependencias)}
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Info adicional */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
        <h3 className="font-medium mb-2">Como funciona:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Faça upload de um arquivo CSV ou Excel com os dados</li>
          <li>A IA irá sugerir o mapeamento dos campos automaticamente</li>
          <li>Revise e ajuste o mapeamento se necessário</li>
          <li>Valide os dados e corrija possíveis erros</li>
          <li>Confirme e importe os dados para o sistema</li>
        </ol>
      </div>
    </div>
  )
}
