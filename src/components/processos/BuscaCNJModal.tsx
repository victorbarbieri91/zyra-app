'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'

interface BuscaCNJModalProps {
  open: boolean
  onClose: () => void
  onDadosEncontrados: (dados: ProcessoEscavadorNormalizado) => void
  onCadastroManual: () => void
  initialCNJ?: string
}

export function BuscaCNJModal({
  open,
  onClose,
  onDadosEncontrados,
  onCadastroManual,
  initialCNJ
}: BuscaCNJModalProps) {
  const [numeroCNJ, setNumeroCNJ] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Preencher CNJ inicial quando o modal abrir
  useEffect(() => {
    if (open && initialCNJ) {
      setNumeroCNJ(initialCNJ)
      setErro(null)
    }
  }, [open, initialCNJ])

  // Reset ao fechar
  const handleClose = () => {
    setNumeroCNJ('')
    setBuscando(false)
    setErro(null)
    onClose()
  }

  // Formata o CNJ enquanto digita
  const handleNumeroCNJChange = (value: string) => {
    // Remove tudo que nao e digito
    const digits = value.replace(/\D/g, '')

    // Aplica formatacao: NNNNNNN-DD.AAAA.J.TR.OOOO
    let formatted = ''
    for (let i = 0; i < digits.length && i < 20; i++) {
      if (i === 7) formatted += '-'
      if (i === 9) formatted += '.'
      if (i === 13) formatted += '.'
      if (i === 14) formatted += '.'
      if (i === 16) formatted += '.'
      formatted += digits[i]
    }

    setNumeroCNJ(formatted)
    setErro(null)
  }

  // Buscar processo
  const handleBuscar = async () => {
    if (!numeroCNJ || numeroCNJ.length < 20) {
      setErro('Digite o numero CNJ completo')
      return
    }

    setBuscando(true)
    setErro(null)

    try {
      const response = await fetch('/api/escavador/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cnj: numeroCNJ })
      })

      const result = await response.json()

      if (!result.sucesso) {
        setErro(result.error || 'Processo nao encontrado')
        return
      }

      // Ir direto para o wizard com os dados
      onDadosEncontrados(result.dados)
    } catch (error) {
      console.error('Erro ao buscar:', error)
      setErro('Erro ao conectar com o servidor')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0">
        <DialogTitle className="sr-only">Buscar Processo por CNJ</DialogTitle>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-[#34495e]">
            Buscar Processo por CNJ
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero_cnj" className="text-sm font-medium text-[#34495e]">
              Número CNJ *
            </Label>
            <Input
              id="numero_cnj"
              placeholder="0000000-00.0000.0.00.0000"
              value={numeroCNJ}
              onChange={(e) => handleNumeroCNJChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              className="text-base font-mono"
              disabled={buscando}
              autoFocus
            />
            <p className="text-xs text-slate-500">
              Digite o número do processo no formato CNJ (20 dígitos)
            </p>
          </div>

          {erro && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800">{erro}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Verifique o número ou tente o cadastro manual.
                </p>
              </div>
            </div>
          )}

          {buscando && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#34495e] animate-spin" />
                <p className="text-sm text-slate-600">Buscando dados do processo...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
          <Button variant="ghost" onClick={handleClose} size="sm">
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCadastroManual} size="sm">
              Cadastro Manual
            </Button>
            <Button
              onClick={handleBuscar}
              disabled={buscando || numeroCNJ.length < 20}
              className="gap-2"
              size="sm"
            >
              {buscando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
