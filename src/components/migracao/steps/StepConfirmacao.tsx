// ============================================
// STEP 5: CONFIRMAÇÃO ANTES DE IMPORTAR
// ============================================

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Info
} from 'lucide-react'
import { MigracaoState, StepMigracao } from '@/types/migracao'
import { getModuloConfig } from '@/lib/migracao/constants'
import { createClient } from '@/lib/supabase/client'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepConfirmacao({ state, updateState, goToStep }: Props) {
  const [confirmado, setConfirmado] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const job = state.job
  if (!job) return null

  const moduloConfig = getModuloConfig(state.modulo)

  // Calcular quantos serão importados
  const linhasAImportar = job.linhas_validas

  // Quantos erros/duplicatas serão ignorados
  const correcoes = job.correcoes_usuario || {}
  const linhasPuladas = Object.values(correcoes).filter(c => c.tipo === 'pular').length
  const linhasAtualizar = Object.values(correcoes).filter(c => c.tipo === 'atualizar').length

  const totalFinal = linhasAImportar - linhasPuladas + linhasAtualizar

  const iniciarImportacao = async () => {
    setIsImporting(true)

    try {
      const supabase = createClient()

      // Disparar Edge Function para importar
      goToStep('importando')

      await supabase.functions.invoke('migracao-processar', {
        body: { job_id: job.id, acao: 'importar' }
      })

    } catch (error) {
      console.error('Erro ao iniciar importação:', error)
      setIsImporting(false)
    }
  }

  const voltar = () => {
    if (job.linhas_com_erro > 0 || job.linhas_duplicadas > 0) {
      goToStep('revisao')
    } else {
      goToStep('mapeamento')
    }
  }

  return (
    <div className="space-y-6">
      {/* Card principal */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-7 h-7 text-blue-600" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800">
              Resumo da Importação
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {job.arquivo_nome}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-slate-800">{totalFinal}</p>
                <p className="text-sm text-slate-500">Registros a importar</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-slate-800">{moduloConfig?.nome}</p>
                <p className="text-sm text-slate-500">Módulo destino</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Detalhes */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xl font-bold text-slate-800">{job.linhas_validas}</p>
              <p className="text-xs text-slate-500">Linhas válidas</p>
            </div>
          </div>
        </Card>

        {linhasPuladas > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xl font-bold text-slate-800">{linhasPuladas}</p>
                <p className="text-xs text-slate-500">Serão ignoradas</p>
              </div>
            </div>
          </Card>
        )}

        {linhasAtualizar > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-slate-800">{linhasAtualizar}</p>
                <p className="text-xs text-slate-500">Serão atualizadas</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Mapeamento resumido */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Mapeamento de campos:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(state.mapeamento)
            .filter(([_, campo]) => campo)
            .map(([header, campo]) => (
              <div key={header} className="flex items-center gap-2 text-slate-600">
                <span className="text-slate-400">{header}</span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
                <span className="font-medium">{campo}</span>
              </div>
            ))}
        </div>

        {job.campos_extras?.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-slate-500">
              <Info className="w-3 h-3 inline mr-1" />
              Campos adicionais serão salvos nas observações:
              <span className="font-medium ml-1">{job.campos_extras.join(', ')}</span>
            </p>
          </div>
        )}
      </Card>

      {/* Checkbox de confirmação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="confirmar"
            checked={confirmado}
            onCheckedChange={(checked) => setConfirmado(!!checked)}
            className="mt-0.5"
          />
          <label htmlFor="confirmar" className="text-sm text-blue-800 cursor-pointer">
            <span className="font-medium">Confirmo que revisei os dados</span> e desejo
            prosseguir com a importação de {totalFinal} registros para o módulo{' '}
            <strong>{moduloConfig?.nome}</strong>.
          </label>
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
        <AlertTriangle className="w-4 h-4 inline mr-2" />
        <strong>Atenção:</strong> Esta ação irá criar novos registros no sistema.
        Revise os dados com atenção antes de confirmar.
      </div>

      {/* Botões de navegação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Button
          onClick={iniciarImportacao}
          disabled={!confirmado || isImporting}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          {isImporting ? 'Iniciando...' : 'Confirmar e Importar'}
          <CheckCircle className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
