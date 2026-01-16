'use client'

import { useState } from 'react'
import { Plus, ChevronDown, Search, FileEdit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BuscaCNJModal } from './BuscaCNJModal'
import ProcessoWizard from './ProcessoWizard'
import ProcessoWizardAutomatico from './ProcessoWizardAutomatico'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'

interface NovoProcessoDropdownProps {
  onProcessoCriado?: () => void
}

export function NovoProcessoDropdown({ onProcessoCriado }: NovoProcessoDropdownProps) {
  const [showBuscaCNJ, setShowBuscaCNJ] = useState(false)
  const [showWizardManual, setShowWizardManual] = useState(false)
  const [showWizardAutomatico, setShowWizardAutomatico] = useState(false)
  const [dadosEscavador, setDadosEscavador] = useState<ProcessoEscavadorNormalizado | null>(null)

  // Handler quando usuario encontra processo no Escavador e quer continuar
  const handleDadosEncontrados = (dados: ProcessoEscavadorNormalizado) => {
    setDadosEscavador(dados)
    setShowBuscaCNJ(false)
    setShowWizardAutomatico(true) // Abre wizard automatico (3 steps)
  }

  // Handler quando wizard manual e fechado
  const handleWizardManualClose = () => {
    setShowWizardManual(false)
  }

  // Handler quando wizard automatico e fechado
  const handleWizardAutomaticoClose = () => {
    setShowWizardAutomatico(false)
    setDadosEscavador(null)
  }

  // Handler quando processo e criado com sucesso
  const handleProcessoCriado = () => {
    handleWizardManualClose()
    handleWizardAutomaticoClose()
    onProcessoCriado?.()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Processo
            <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onClick={() => setShowBuscaCNJ(true)}
            className="flex items-start gap-3 p-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-900">
                Buscar por CNJ
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Importar dados automaticamente
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowWizardManual(true)}
            className="flex items-start gap-3 p-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <FileEdit className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-900">
                Cadastro Manual
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Preencher todos os dados
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Busca por CNJ */}
      <BuscaCNJModal
        open={showBuscaCNJ}
        onClose={() => setShowBuscaCNJ(false)}
        onDadosEncontrados={handleDadosEncontrados}
        onCadastroManual={() => {
          setShowBuscaCNJ(false)
          setShowWizardManual(true)
        }}
      />

      {/* Wizard Manual (5 steps - cadastro do zero) */}
      {showWizardManual && (
        <ProcessoWizard
          open={showWizardManual}
          onClose={handleWizardManualClose}
          onProcessoCriado={handleProcessoCriado}
        />
      )}

      {/* Wizard Automatico (3 steps - dados do Escavador) */}
      {showWizardAutomatico && dadosEscavador && (
        <ProcessoWizardAutomatico
          open={showWizardAutomatico}
          onClose={handleWizardAutomaticoClose}
          dadosEscavador={dadosEscavador}
          onProcessoCriado={handleProcessoCriado}
        />
      )}
    </>
  )
}
