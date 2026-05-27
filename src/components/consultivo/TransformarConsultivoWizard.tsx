'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  Scale,
  Search,
  User,
  MapPin,
  Gavel,
  FileText,
  DollarSign,
  ListTodo,
  Archive,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { normalizarInstancia } from '@/lib/constants/processo-enums'
import { formatAreaJuridica } from '@/lib/constants/areas-juridicas'
import { formatCurrency, cn } from '@/lib/utils'
import { BuscaCNJModal } from '@/components/processos/BuscaCNJModal'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'

interface Consulta {
  id: string
  numero: string | null
  titulo: string
  descricao: string | null
  cliente_id: string
  cliente_nome: string
  area: string
  status: string
  prioridade: string
  prazo: string | null
  responsavel_id: string
  responsavel_nome: string
  contrato_id: string | null
  anexos: unknown[]
  andamentos: unknown[]
  created_at: string
}

interface ContratoInfo {
  id: string
  numero_contrato: string
  titulo: string
  forma_cobranca: string
  valor_total: number | null
}

interface TransformarConsultivoWizardProps {
  open: boolean
  onClose: () => void
  consulta: Consulta
  onSuccess?: (processoId: string, numeroPasta: string) => void
}

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-[#46627f] dark:text-slate-400">
      {children}
    </div>
  )
}

function HeritageField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#46627f] mb-0.5">
          {label}
        </div>
        <div className="text-sm text-[#34495e] dark:text-slate-200">{children}</div>
      </div>
    </div>
  )
}

export default function TransformarConsultivoWizard({
  open,
  onClose,
  consulta,
  onSuccess,
}: TransformarConsultivoWizardProps) {
  const supabase = createClient()

  // Form state
  const [numeroCnj, setNumeroCnj] = useState('')
  const [tipo, setTipo] = useState('judicial')
  const [dataDistribuicao, setDataDistribuicao] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [poloCliente, setPoloCliente] = useState<'ativo' | 'passivo' | 'terceiro'>('ativo')
  const [parteContraria, setParteContraria] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [comarca, setComarca] = useState('')
  const [vara, setVara] = useState('')
  const [uf, setUf] = useState('')
  const [fase, setFase] = useState('conhecimento')
  const [instancia, setInstancia] = useState('1a')
  const [valorCausa, setValorCausa] = useState('')

  // Opções de transformação
  const [manterContrato, setManterContrato] = useState(true)
  const [migrarAndamentos, setMigrarAndamentos] = useState(true)
  const [arquivarConsultivo, setArquivarConsultivo] = useState(true)

  // UI state
  const [loading, setLoading] = useState(false)
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null)
  const [showBuscaCNJ, setShowBuscaCNJ] = useState(false)

  // Carregar info do contrato vinculado
  useEffect(() => {
    if (!open || !consulta.contrato_id) {
      setContratoInfo(null)
      return
    }
    let cancelled = false
    const load = async () => {
      const { data } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('id, numero_contrato, titulo, forma_cobranca, valor_total')
        .eq('id', consulta.contrato_id)
        .single()
      if (!cancelled && data) setContratoInfo(data as ContratoInfo)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, consulta.contrato_id, supabase])

  const resetForm = () => {
    setNumeroCnj('')
    setTipo('judicial')
    setDataDistribuicao(new Date().toISOString().split('T')[0])
    setPoloCliente('ativo')
    setParteContraria('')
    setTribunal('')
    setComarca('')
    setVara('')
    setUf('')
    setFase('conhecimento')
    setInstancia('1a')
    setValorCausa('')
    setManterContrato(true)
    setMigrarAndamentos(true)
    setArquivarConsultivo(true)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Quando o BuscaCNJModal retorna dados do Escavador, preencher o form
  const handleDadosEscavador = (dados: ProcessoEscavadorNormalizado) => {
    setNumeroCnj(dados.numero_cnj || '')
    if (dados.tribunal) setTribunal(dados.tribunal)
    if (dados.vara) setVara(dados.vara)
    if (dados.comarca) setComarca(dados.comarca)
    if (dados.estado) setUf(dados.estado)
    if (dados.data_distribuicao) {
      setDataDistribuicao(dados.data_distribuicao.split('T')[0])
    }
    if (dados.valor_causa != null) {
      setValorCausa(String(dados.valor_causa))
    }

    // Instância via grau (1, 2, 3)
    if (dados.grau === 1) setInstancia('1a')
    else if (dados.grau === 2) setInstancia('2a')
    else if (dados.grau === 3) setInstancia('3a')

    // Parte contrária: oposto do polo atual do cliente
    if (poloCliente === 'ativo' && dados.titulo_polo_passivo) {
      setParteContraria(dados.titulo_polo_passivo)
    } else if (poloCliente === 'passivo' && dados.titulo_polo_ativo) {
      setParteContraria(dados.titulo_polo_ativo)
    }

    setShowBuscaCNJ(false)
    toast.success('Dados do Escavador preenchidos')
  }

  const handleSubmit = async () => {
    if (!dataDistribuicao) {
      toast.error('Data de distribuição é obrigatória')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('transformar_consultivo_em_processo', {
        p_consultivo_id: consulta.id,
        p_numero_cnj: numeroCnj || null,
        p_tipo: tipo,
        p_data_distribuicao: dataDistribuicao,
        p_polo_cliente: poloCliente,
        p_parte_contraria: parteContraria || null,
        p_tribunal: tribunal || null,
        p_comarca: comarca || null,
        p_vara: vara || null,
        p_uf: uf || null,
        p_fase: fase,
        p_instancia: normalizarInstancia(instancia) || '1a',
        p_valor_causa: valorCausa ? parseFloat(valorCausa) : null,
        p_manter_contrato: manterContrato,
        p_migrar_andamentos: migrarAndamentos,
        p_arquivar_consultivo: arquivarConsultivo,
      })

      if (error) throw error

      const resultado = data as {
        sucesso: boolean
        processo_id?: string
        numero_pasta?: string
        mensagem?: string
        erro?: string
      }

      if (resultado.sucesso && resultado.processo_id && resultado.numero_pasta) {
        toast.success(resultado.mensagem || 'Processo criado com sucesso')
        handleClose()
        onSuccess?.(resultado.processo_id, resultado.numero_pasta)
      } else {
        toast.error(resultado.erro || 'Erro ao transformar consultivo')
      }
    } catch (err) {
      console.error('Erro ao transformar consultivo:', err)
      toast.error('Erro ao transformar consultivo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const andamentosCount = Array.isArray(consulta.andamentos) ? consulta.andamentos.length : 0

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="!p-0 gap-0 sm:max-w-5xl max-h-[92vh] flex flex-col">
          <DialogTitle className="sr-only">Transformar em Processo</DialogTitle>

          {/* Header */}
          <div className="flex items-start gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-[#f0f9f9] dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5 text-[#89bcbe]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-[#34495e] dark:text-slate-200">
                Transformar em Processo
              </h2>
              <DialogDescription className="text-sm text-[#46627f] dark:text-slate-400 mt-0.5">
                {consulta.numero ?? 'Consulta'} &rarr; novo processo judicial
              </DialogDescription>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8">
              {/* Coluna esquerda — Dados Herdados */}
              <div className="space-y-4">
                <SectionTitle>Dados Herdados</SectionTitle>

                <div className="bg-[#f0f9f9] dark:bg-teal-500/10 border border-[#89bcbe]/40 dark:border-teal-500/30 rounded-lg p-4 space-y-4">
                  <HeritageField icon={User} label="Cliente">
                    {consulta.cliente_nome}
                  </HeritageField>

                  <HeritageField icon={Gavel} label="Responsável">
                    {consulta.responsavel_nome}
                  </HeritageField>

                  <HeritageField icon={Scale} label="Área Jurídica">
                    {formatAreaJuridica(consulta.area)}
                  </HeritageField>

                  <HeritageField icon={FileText} label="Objeto da Ação">
                    <span className="line-clamp-2">{consulta.titulo}</span>
                  </HeritageField>
                </div>

                {/* Contrato vinculado */}
                {contratoInfo && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-surface-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#89bcbe]" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#46627f]">
                          Contrato vinculado
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-[#46627f] border-[#89bcbe]/40">
                        {contratoInfo.forma_cobranca}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">
                      {contratoInfo.numero_contrato}
                    </p>
                    {contratoInfo.valor_total != null && (
                      <p className="text-xs text-[#46627f] mt-0.5">
                        {formatCurrency(contratoInfo.valor_total)}
                      </p>
                    )}
                    <label className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 cursor-pointer">
                      <Checkbox
                        checked={manterContrato}
                        onCheckedChange={(c) => setManterContrato(!!c)}
                      />
                      <span className="text-sm text-[#46627f] dark:text-slate-300">
                        Manter contrato vinculado ao processo
                      </span>
                    </label>
                  </div>
                )}

                {/* Andamentos */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-surface-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ListTodo className="w-4 h-4 text-[#89bcbe]" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#46627f]">
                      Andamentos da consulta
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px] text-[#46627f] border-slate-200">
                      {andamentosCount}
                    </Badge>
                  </div>
                  <label className={cn(
                    'flex items-center gap-2 cursor-pointer',
                    andamentosCount === 0 && 'opacity-50',
                  )}>
                    <Checkbox
                      checked={migrarAndamentos}
                      disabled={andamentosCount === 0}
                      onCheckedChange={(c) => setMigrarAndamentos(!!c)}
                    />
                    <span className="text-sm text-[#46627f] dark:text-slate-300">
                      Migrar para movimentações do processo
                    </span>
                  </label>
                </div>

                {/* Arquivar consultivo */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-surface-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Archive className="w-4 h-4 text-[#89bcbe]" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#46627f]">
                      Pasta consultiva
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={arquivarConsultivo}
                      onCheckedChange={(c) => setArquivarConsultivo(!!c)}
                    />
                    <span className="text-sm text-[#46627f] dark:text-slate-300">
                      Arquivar após transformação
                    </span>
                  </label>
                </div>
              </div>

              {/* Coluna direita — Dados do Processo */}
              <div className="space-y-4">
                <SectionTitle>Dados do Processo</SectionTitle>

                {/* Campos */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Número CNJ <span className="text-[#46627f] font-normal">(opcional)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="0000000-00.0000.0.00.0000"
                        value={numeroCnj}
                        onChange={(e) => setNumeroCnj(e.target.value)}
                        className="h-10 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBuscaCNJ(true)}
                        className="h-10 gap-2 shrink-0"
                      >
                        <Search className="w-4 h-4" />
                        Buscar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Tipo *</Label>
                      <Select value={tipo} onValueChange={setTipo}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="judicial">Judicial</SelectItem>
                          <SelectItem value="administrativo">Administrativo</SelectItem>
                          <SelectItem value="arbitragem">Arbitragem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Data distribuição *</Label>
                      <Input
                        type="date"
                        value={dataDistribuicao}
                        onChange={(e) => setDataDistribuicao(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Polo do cliente *</Label>
                      <Select
                        value={poloCliente}
                        onValueChange={(v) => setPoloCliente(v as 'ativo' | 'passivo' | 'terceiro')}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Polo Ativo (Autor)</SelectItem>
                          <SelectItem value="passivo">Polo Passivo (Réu)</SelectItem>
                          <SelectItem value="terceiro">Terceiro Interessado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Parte contrária</Label>
                      <Input
                        placeholder="Nome da parte contrária"
                        value={parteContraria}
                        onChange={(e) => setParteContraria(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Fase</Label>
                      <Select value={fase} onValueChange={setFase}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conhecimento">Conhecimento</SelectItem>
                          <SelectItem value="recurso">Recurso</SelectItem>
                          <SelectItem value="execucao">Execução</SelectItem>
                          <SelectItem value="cumprimento_sentenca">Cumprimento de Sentença</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Instância</Label>
                      <Select value={instancia} onValueChange={setInstancia}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1a">1ª Instância</SelectItem>
                          <SelectItem value="2a">2ª Instância</SelectItem>
                          <SelectItem value="3a">3ª Instância</SelectItem>
                          <SelectItem value="stj">STJ</SelectItem>
                          <SelectItem value="stf">STF</SelectItem>
                          <SelectItem value="tst">TST</SelectItem>
                          <SelectItem value="administrativa">Administrativa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Localização */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#89bcbe]" />
                      <SectionTitle>Localização</SectionTitle>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Tribunal</Label>
                        <Input
                          placeholder="Ex: TJSP, TRT2"
                          value={tribunal}
                          onChange={(e) => setTribunal(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">UF</Label>
                        <Select value={uf} onValueChange={setUf}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {UFS.map((estado) => (
                              <SelectItem key={estado} value={estado}>
                                {estado}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Comarca</Label>
                        <Input
                          placeholder="Ex: São Paulo"
                          value={comarca}
                          onChange={(e) => setComarca(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Vara/Câmara</Label>
                        <Input
                          placeholder="Ex: 1ª Vara Cível"
                          value={vara}
                          onChange={(e) => setVara(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor da causa (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={valorCausa}
                      onChange={(e) => setValorCausa(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !dataDistribuicao}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  Criar Processo
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de busca CNJ via Escavador */}
      <BuscaCNJModal
        open={showBuscaCNJ}
        onClose={() => setShowBuscaCNJ(false)}
        onDadosEncontrados={handleDadosEscavador}
        onCadastroManual={() => setShowBuscaCNJ(false)}
        initialCNJ={numeroCnj}
      />
    </>
  )
}
