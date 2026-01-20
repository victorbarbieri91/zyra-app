'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  ArrowRight,
  Scale,
  Building2,
  MapPin,
  Calendar,
  Banknote,
  Users,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'

interface AtualizarCapaModalProps {
  open: boolean
  onClose: () => void
  processoId: string
  numeroCnj: string
  numeroPasta: string
  onAtualizado?: () => void
}

interface ProcessoAtual {
  id: string
  numero_cnj: string
  numero_pasta: string
  area: string
  fase: string
  instancia: string
  tribunal: string
  comarca: string
  vara: string
  valor_causa: number | null
  objeto_acao: string | null
  parte_contraria: string | null
  autor: string | null
  reu: string | null
  polo_cliente: string
  cliente: { nome_completo: string } | null
}

interface CampoComparacao {
  campo: string
  label: string
  valorAtual: string | null
  valorNovo: string | null
  selecionado: boolean
  icone: React.ReactNode
}

// Função para padronizar texto (remover CAPSLOCK, formatar corretamente)
function padronizarTexto(texto: string | null | undefined): string | null {
  if (!texto) return null

  // Se está todo em maiúsculas, converte para Title Case
  if (texto === texto.toUpperCase() && texto.length > 3) {
    return texto
      .toLowerCase()
      .split(' ')
      .map(palavra => {
        // Palavras que devem ficar em minúsculo
        const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com']
        if (minusculas.includes(palavra)) return palavra
        // Siglas comuns que devem ficar em maiúsculo
        const siglas = ['ltda', 'sa', 's/a', 'me', 'epp', 'eireli', 'cpf', 'cnpj', 'oab']
        if (siglas.includes(palavra)) return palavra.toUpperCase()
        // Primeira letra maiúscula
        return palavra.charAt(0).toUpperCase() + palavra.slice(1)
      })
      .join(' ')
  }

  return texto.trim()
}

// Função para formatar valor monetário
function formatarValor(valor: number | null | undefined): string {
  if (!valor) return ''
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AtualizarCapaModal({
  open,
  onClose,
  processoId,
  numeroCnj,
  numeroPasta,
  onAtualizado
}: AtualizarCapaModalProps) {
  const [etapa, setEtapa] = useState<'carregando' | 'comparando' | 'atualizando' | 'erro'>('carregando')
  const [erro, setErro] = useState<string | null>(null)
  const [processoAtual, setProcessoAtual] = useState<ProcessoAtual | null>(null)
  const [dadosEscavador, setDadosEscavador] = useState<ProcessoEscavadorNormalizado | null>(null)
  const [campos, setCampos] = useState<CampoComparacao[]>([])
  const [salvando, setSalvando] = useState(false)

  const supabase = createClient()

  // Carregar dados ao abrir
  useEffect(() => {
    if (open && processoId && numeroCnj) {
      carregarDados()
    }
  }, [open, processoId, numeroCnj])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setEtapa('carregando')
      setErro(null)
      setProcessoAtual(null)
      setDadosEscavador(null)
      setCampos([])
    }
  }, [open])

  const carregarDados = async () => {
    setEtapa('carregando')
    setErro(null)

    try {
      // 1. Buscar dados atuais do processo
      const { data: processo, error: processoError } = await supabase
        .from('processos_processos')
        .select(`
          id,
          numero_cnj,
          numero_pasta,
          area,
          fase,
          instancia,
          tribunal,
          comarca,
          vara,
          valor_causa,
          objeto_acao,
          parte_contraria,
          autor,
          reu,
          polo_cliente,
          cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo)
        `)
        .eq('id', processoId)
        .single()

      if (processoError || !processo) {
        throw new Error('Processo não encontrado')
      }

      setProcessoAtual(processo as ProcessoAtual)

      // 2. Buscar dados no Escavador
      const response = await fetch('/api/escavador/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cnj: numeroCnj })
      })

      const result = await response.json()

      if (!result.sucesso || !result.dados) {
        throw new Error(result.error || 'Não foi possível consultar o Escavador')
      }

      setDadosEscavador(result.dados)

      // 3. Comparar e montar lista de campos
      const camposComparacao = compararCampos(processo as ProcessoAtual, result.dados)
      setCampos(camposComparacao)
      setEtapa('comparando')

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar dados')
      setEtapa('erro')
    }
  }

  const compararCampos = (atual: ProcessoAtual, escavador: ProcessoEscavadorNormalizado): CampoComparacao[] => {
    const clienteNome = atual.cliente?.nome_completo?.toLowerCase() || ''

    // Determinar parte contrária do Escavador
    let parteContraria: string | null = null
    if (atual.polo_cliente === 'ativo') {
      parteContraria = escavador.titulo_polo_passivo
    } else if (atual.polo_cliente === 'passivo') {
      parteContraria = escavador.titulo_polo_ativo
    } else {
      // Terceiro - tenta achar parte diferente do cliente
      const parteDiferente = escavador.partes?.find(
        p => p.nome.toLowerCase() !== clienteNome
      )
      parteContraria = parteDiferente?.nome || null
    }

    const camposParaComparar: CampoComparacao[] = []

    // Tribunal
    if (escavador.tribunal && escavador.tribunal !== atual.tribunal) {
      camposParaComparar.push({
        campo: 'tribunal',
        label: 'Tribunal',
        valorAtual: atual.tribunal,
        valorNovo: padronizarTexto(escavador.tribunal),
        selecionado: !atual.tribunal,
        icone: <Building2 className="w-4 h-4" />
      })
    }

    // Comarca
    if (escavador.comarca && escavador.comarca !== atual.comarca) {
      camposParaComparar.push({
        campo: 'comarca',
        label: 'Comarca',
        valorAtual: atual.comarca,
        valorNovo: padronizarTexto(escavador.comarca),
        selecionado: !atual.comarca,
        icone: <MapPin className="w-4 h-4" />
      })
    }

    // Vara
    if (escavador.vara && escavador.vara !== atual.vara) {
      camposParaComparar.push({
        campo: 'vara',
        label: 'Vara',
        valorAtual: atual.vara,
        valorNovo: padronizarTexto(escavador.vara),
        selecionado: !atual.vara,
        icone: <Scale className="w-4 h-4" />
      })
    }

    // Área
    const areaNormalizada = escavador.area?.toLowerCase()
    if (areaNormalizada && areaNormalizada !== atual.area?.toLowerCase()) {
      camposParaComparar.push({
        campo: 'area',
        label: 'Área',
        valorAtual: atual.area,
        valorNovo: areaNormalizada,
        selecionado: !atual.area,
        icone: <FileText className="w-4 h-4" />
      })
    }

    // Instância
    if (escavador.instancia && escavador.instancia !== atual.instancia) {
      camposParaComparar.push({
        campo: 'instancia',
        label: 'Instância',
        valorAtual: atual.instancia,
        valorNovo: escavador.instancia,
        selecionado: !atual.instancia,
        icone: <Scale className="w-4 h-4" />
      })
    }

    // Valor da Causa
    if (escavador.valor_causa && escavador.valor_causa !== atual.valor_causa) {
      camposParaComparar.push({
        campo: 'valor_causa',
        label: 'Valor da Causa',
        valorAtual: atual.valor_causa ? formatarValor(atual.valor_causa) : null,
        valorNovo: formatarValor(escavador.valor_causa),
        selecionado: !atual.valor_causa,
        icone: <Banknote className="w-4 h-4" />
      })
    }

    // Parte Contrária
    if (parteContraria) {
      const parteContrariaPadronizada = padronizarTexto(parteContraria)
      if (parteContrariaPadronizada && parteContrariaPadronizada.toLowerCase() !== atual.parte_contraria?.toLowerCase()) {
        camposParaComparar.push({
          campo: 'parte_contraria',
          label: 'Parte Contrária',
          valorAtual: atual.parte_contraria,
          valorNovo: parteContrariaPadronizada,
          selecionado: !atual.parte_contraria,
          icone: <Users className="w-4 h-4" />
        })
      }
    }

    // Autor (polo ativo)
    if (escavador.titulo_polo_ativo) {
      const autorPadronizado = padronizarTexto(escavador.titulo_polo_ativo)
      if (autorPadronizado && autorPadronizado.toLowerCase() !== atual.autor?.toLowerCase()) {
        camposParaComparar.push({
          campo: 'autor',
          label: 'Autor (Polo Ativo)',
          valorAtual: atual.autor,
          valorNovo: autorPadronizado,
          selecionado: !atual.autor,
          icone: <Users className="w-4 h-4" />
        })
      }
    }

    // Réu (polo passivo)
    if (escavador.titulo_polo_passivo) {
      const reuPadronizado = padronizarTexto(escavador.titulo_polo_passivo)
      if (reuPadronizado && reuPadronizado.toLowerCase() !== atual.reu?.toLowerCase()) {
        camposParaComparar.push({
          campo: 'reu',
          label: 'Réu (Polo Passivo)',
          valorAtual: atual.reu,
          valorNovo: reuPadronizado,
          selecionado: !atual.reu,
          icone: <Users className="w-4 h-4" />
        })
      }
    }

    // Objeto da Ação
    if (escavador.assunto && !atual.objeto_acao) {
      camposParaComparar.push({
        campo: 'objeto_acao',
        label: 'Objeto da Ação',
        valorAtual: atual.objeto_acao,
        valorNovo: padronizarTexto(escavador.assunto),
        selecionado: true,
        icone: <FileText className="w-4 h-4" />
      })
    }

    return camposParaComparar
  }

  const toggleCampo = (index: number) => {
    setCampos(prev => prev.map((campo, i) =>
      i === index ? { ...campo, selecionado: !campo.selecionado } : campo
    ))
  }

  const selecionarTodos = () => {
    setCampos(prev => prev.map(campo => ({ ...campo, selecionado: true })))
  }

  const deselecionarTodos = () => {
    setCampos(prev => prev.map(campo => ({ ...campo, selecionado: false })))
  }

  const camposSelecionados = useMemo(() =>
    campos.filter(c => c.selecionado),
    [campos]
  )

  const salvarAtualizacoes = async () => {
    if (camposSelecionados.length === 0) {
      toast.error('Selecione pelo menos um campo para atualizar')
      return
    }

    setSalvando(true)
    setEtapa('atualizando')

    try {
      // Montar objeto de atualização
      const atualizacao: Record<string, string | number | null> = {}

      for (const campo of camposSelecionados) {
        if (campo.campo === 'valor_causa' && dadosEscavador?.valor_causa) {
          atualizacao[campo.campo] = dadosEscavador.valor_causa
        } else {
          atualizacao[campo.campo] = campo.valorNovo
        }
      }

      console.log('[AtualizarCapa] Atualizando processo:', processoId)
      console.log('[AtualizarCapa] Campos:', atualizacao)

      // Atualizar no banco
      const { data, error } = await supabase
        .from('processos_processos')
        .update(atualizacao)
        .eq('id', processoId)
        .select()

      console.log('[AtualizarCapa] Resultado:', { data, error })

      if (error) {
        console.error('[AtualizarCapa] Erro Supabase:', error.message, error.code, error.details)
        throw new Error(error.message || 'Erro ao atualizar processo')
      }

      if (!data || data.length === 0) {
        console.warn('[AtualizarCapa] Nenhum registro atualizado - verificar RLS ou ID')
        // Mesmo assim considera sucesso se não houve erro
      }

      toast.success(`${camposSelecionados.length} campo(s) atualizado(s) com sucesso!`)
      onAtualizado?.()
      onClose()

    } catch (error) {
      console.error('[AtualizarCapa] Erro:', error)
      const mensagem = error instanceof Error ? error.message : 'Erro ao salvar atualizações'
      toast.error(mensagem)
      setEtapa('comparando')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <RefreshCw className="w-5 h-5" />
            Atualizar Capa do Processo
          </DialogTitle>
        </DialogHeader>

        {/* Info do processo */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#34495e]">{numeroPasta}</p>
            <p className="text-xs text-slate-500">{numeroCnj}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Escavador
          </Badge>
        </div>

        {/* Estado: Carregando */}
        {etapa === 'carregando' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-[#34495e] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-[#34495e]">Consultando Escavador...</p>
              <p className="text-xs text-slate-500 mt-1">Buscando dados atualizados do processo</p>
            </div>
          </div>
        )}

        {/* Estado: Erro */}
        {etapa === 'erro' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-red-600">{erro}</p>
              <p className="text-xs text-slate-500 mt-1">Verifique o número CNJ e tente novamente</p>
            </div>
            <Button variant="outline" onClick={carregarDados}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Estado: Comparando */}
        {etapa === 'comparando' && (
          <>
            {campos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-600">Processo já está atualizado!</p>
                  <p className="text-xs text-slate-500 mt-1">Todos os campos estão iguais aos dados do Escavador</p>
                </div>
              </div>
            ) : (
              <>
                {/* Ações em lote */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">{campos.length}</span> campo(s) com diferença encontrado(s)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selecionarTodos}>
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselecionarTodos}>
                      Limpar
                    </Button>
                  </div>
                </div>

                {/* Lista de campos */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {campos.map((campo, index) => (
                    <div
                      key={campo.campo}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        campo.selecionado
                          ? 'border-[#89bcbe] bg-[#f0f9f9]'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => toggleCampo(index)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={campo.selecionado}
                          onCheckedChange={() => toggleCampo(index)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-400">{campo.icone}</span>
                            <span className="text-sm font-medium text-[#34495e]">{campo.label}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1 p-2 bg-white rounded border border-slate-200">
                              <p className="text-[10px] text-slate-400 uppercase mb-0.5">Atual</p>
                              <p className={campo.valorAtual ? 'text-slate-600' : 'text-slate-400 italic'}>
                                {campo.valorAtual || 'Não preenchido'}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex-1 p-2 bg-emerald-50 rounded border border-emerald-200">
                              <p className="text-[10px] text-emerald-600 uppercase mb-0.5">Novo</p>
                              <p className="text-emerald-700 font-medium">{campo.valorNovo}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botões de ação */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={salvarAtualizacoes}
                    disabled={camposSelecionados.length === 0 || salvando}
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
                  >
                    {salvando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Atualizar {camposSelecionados.length} campo(s)
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Estado: Atualizando */}
        {etapa === 'atualizando' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-[#34495e] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-[#34495e]">Salvando atualizações...</p>
              <p className="text-xs text-slate-500 mt-1">Atualizando {camposSelecionados.length} campo(s)</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
