'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RotateCcw,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import StepIndicator from '@/components/wizards/StepIndicator'
import type { WizardStep } from '@/components/wizards/types'
import { useImportarFatura } from './useImportarFatura'
import ImportarFaturaStep1 from './ImportarFaturaStep1'
import ImportarFaturaStep2 from './ImportarFaturaStep2'
import ImportarFaturaStep3 from './ImportarFaturaStep3'

const STEPS: WizardStep[] = [
  { id: 'upload', title: 'Upload' },
  { id: 'revisao', title: 'Revisão' },
  { id: 'resultado', title: 'Resultado' },
]

interface ImportarFaturaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function ImportarFaturaModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportarFaturaModalProps) {
  const router = useRouter()
  const hook = useImportarFatura({
    open,
    onSuccess,
    onClose: () => onOpenChange(false),
  })

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] w-full flex flex-col p-0 gap-0 sm:rounded-lg max-sm:max-w-full max-sm:max-h-full max-sm:rounded-none">
        <DialogTitle className="sr-only">Importar Fatura</DialogTitle>

        {/* Header fixo */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#34495e] dark:text-slate-100">
                Importar Fatura
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {hook.etapa === 1 && 'Envie o PDF da fatura do cartão'}
                {hook.etapa === 2 && 'Revise os lançamentos antes de importar'}
                {hook.etapa === 3 && 'Importação concluída'}
              </p>
            </div>
            <StepIndicator steps={STEPS} currentStep={hook.etapa - 1} />
          </div>
        </div>

        {/* Body scrollável */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {(hook.loadingEscritorio || (!hook.escritorioAtivo && hook.escritoriosGrupo.length === 0)) ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe] mx-auto mb-2" />
                <p className="text-xs text-slate-500">Carregando...</p>
              </div>
            </div>
          ) : (
            <>
              {hook.etapa === 1 && (
                <ImportarFaturaStep1
                  cartoes={hook.cartoes}
                  selectedCartao={hook.selectedCartao}
                  setSelectedCartao={hook.setSelectedCartao}
                  loading={hook.loading}
                  uploadedFile={hook.uploadedFile}
                  setUploadedFile={hook.setUploadedFile}
                  getRootProps={hook.getRootProps}
                  getInputProps={hook.getInputProps}
                  isDragActive={hook.isDragActive}
                  formatFileSize={hook.formatFileSize}
                  escritoriosGrupo={hook.escritoriosGrupo}
                />
              )}

              {hook.etapa === 2 && (
                <ImportarFaturaStep2
                  cartaoSelecionado={hook.cartaoSelecionado}
                  uploadedFile={hook.uploadedFile}
                  dadosFatura={hook.dadosFatura}
                  mesReferenciaFatura={hook.mesReferenciaFatura}
                  setMesReferenciaFatura={hook.setMesReferenciaFatura}
                  opcoesMeses={hook.opcoesMeses}
                  transacoes={hook.transacoes}
                  transacoesSelecionadas={hook.transacoesSelecionadas}
                  totalSelecionado={hook.totalSelecionado}
                  faturaExistente={hook.faturaExistente}
                  verificandoDuplicatas={hook.verificandoDuplicatas}
                  editingDescricaoId={hook.editingDescricaoId}
                  editingDescricaoValue={hook.editingDescricaoValue}
                  setEditingDescricaoValue={hook.setEditingDescricaoValue}
                  editingDataId={hook.editingDataId}
                  editingDataValue={hook.editingDataValue}
                  setEditingDataValue={hook.setEditingDataValue}
                  editingTransacao={hook.editingTransacao}
                  setEditingTransacao={hook.setEditingTransacao}
                  editModalOpen={hook.editModalOpen}
                  setEditModalOpen={hook.setEditModalOpen}
                  toggleTransacao={hook.toggleTransacao}
                  toggleTodas={hook.toggleTodas}
                  startEditingDescricao={hook.startEditingDescricao}
                  saveDescricao={hook.saveDescricao}
                  cancelEditingDescricao={hook.cancelEditingDescricao}
                  startEditingData={hook.startEditingData}
                  saveData={hook.saveData}
                  cancelEditingData={hook.cancelEditingData}
                  updateCategoria={hook.updateCategoria}
                  updateTipoTransacao={hook.updateTipoTransacao}
                  handleEditTransacao={hook.handleEditTransacao}
                  handleSaveEdit={hook.handleSaveEdit}
                  handleRemoveTransacao={hook.handleRemoveTransacao}
                  formatCurrency={hook.formatCurrency}
                  formatDate={hook.formatDate}
                />
              )}

              {hook.etapa === 3 && (
                <ImportarFaturaStep3
                  totalImportado={hook.totalImportado}
                  valorTotalImportado={hook.valorTotalImportado}
                  cartaoSelecionado={hook.cartaoSelecionado}
                  formatCurrency={hook.formatCurrency}
                />
              )}
            </>
          )}
        </div>

        {/* Footer fixo com botões contextuais */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1">
          {hook.etapa === 1 && (
            <div className="flex justify-end">
              <Button
                onClick={hook.handleProcessar}
                disabled={!hook.uploadedFile || !hook.selectedCartao || hook.uploading || hook.cartoes.length === 0}
                className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
              >
                {hook.uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Processar Fatura
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {hook.etapa === 2 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={hook.handleVoltarStep1}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Voltar
              </Button>
              <Button
                onClick={hook.handleImportar}
                disabled={hook.transacoesSelecionadas.length === 0 || hook.importando}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
              >
                {hook.importando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    Importar {hook.transacoesSelecionadas.length} Lançamentos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {hook.etapa === 3 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={hook.handleNovaImportacao}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Nova Importação
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Fechar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleClose()
                    router.push(`/dashboard/financeiro/cartoes/${hook.selectedCartao}`)
                  }}
                  className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Ver Lançamentos
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
