'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
  Check,
  Loader2,
  Scale,
  ArrowRight,
  Search,
  User,
  Calendar,
  Building2,
  MapPin,
  Gavel,
  FileText,
  DollarSign,
  ListTodo,
  Archive,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

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
  anexos: any[]
  andamentos: any[]
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

export default function TransformarConsultivoWizard({
  open,
  onClose,
  consulta,
  onSuccess
}: TransformarConsultivoWizardProps) {
  const supabase = createClient()

  // Form state
  const [numeroCnj, setNumeroCnj] = useState('')
  const [tipo, setTipo] = useState('judicial')
  const [dataDistribuicao, setDataDistribuicao] = useState(new Date().toISOString().split('T')[0])
  const [poloCliente, setPoloCliente] = useState('ativo')
  const [parteContraria, setParteContraria] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [comarca, setComarca] = useState('')
  const [vara, setVara] = useState('')
  const [uf, setUf] = useState('')
  const [fase, setFase] = useState('conhecimento')
  const [instancia, setInstancia] = useState('1ª')
  const [valorCausa, setValorCausa] = useState('')

  // Opções de transformação
  const [manterContrato, setManterContrato] = useState(true)
  const [migrarAndamentos, setMigrarAndamentos] = useState(true)
  const [arquivarConsultivo, setArquivarConsultivo] = useState(true)

  // Loading states
  const [loading, setLoading] = useState(false)
  const [consultandoCNJ, setConsultandoCNJ] = useState(false)
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null)

  // Carregar info do contrato
  useEffect(() => {
    if (open && consulta.contrato_id) {
      loadContrato()
    }
  }, [open, consulta.contrato_id])

  const loadContrato = async () => {
    if (!consulta.contrato_id) return

    const { data } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('id, numero_contrato, titulo, forma_cobranca, valor_total')
      .eq('id', consulta.contrato_id)
      .single()

    if (data) {
      setContratoInfo(data)
    }
  }

  // Buscar dados no DataJud
  const handleBuscarDataJud = async () => {
    if (!numeroCnj.trim()) {
      toast.error('Digite o número CNJ primeiro')
      return
    }

    setConsultandoCNJ(true)
    try {
      const response = await fetch('/api/datajud/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cnj: numeroCnj })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Erro na consulta')
        return
      }

      if (result.sucesso && result.dados) {
        const dados = result.dados
        setTribunal(dados.tribunal || '')
        setVara(dados.orgao_julgador || '')
        if (dados.data_ajuizamento) {
          setDataDistribuicao(dados.data_ajuizamento.split('T')[0])
        }
        toast.success('Dados encontrados e preenchidos!')
      } else {
        toast.error('Processo não encontrado no DataJud')
      }
    } catch (error) {
      console.error('Erro ao consultar DataJud:', error)
      toast.error('Erro ao consultar DataJud')
    } finally {
      setConsultandoCNJ(false)
    }
  }

  const handleClose = () => {
    // Reset form
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
    setInstancia('1ª')
    setValorCausa('')
    setManterContrato(true)
    setMigrarAndamentos(true)
    setArquivarConsultivo(true)
    onClose()
  }

  const handleSubmit = async () => {
    // Validações mínimas
    if (!dataDistribuicao) {
      toast.error('Data de distribuição é obrigatória')
      return
    }

    setLoading(true)

    try {
      // Chamar a função SQL
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
        p_instancia: instancia,
        p_valor_causa: valorCausa ? parseFloat(valorCausa) : null,
        p_manter_contrato: manterContrato,
        p_migrar_andamentos: migrarAndamentos,
        p_arquivar_consultivo: arquivarConsultivo
      })

      if (error) throw error

      const resultado = data as any

      if (resultado.sucesso) {
        toast.success(resultado.mensagem || 'Processo criado com sucesso!')
        handleClose()
        onSuccess?.(resultado.processo_id, resultado.numero_pasta)
      } else {
        toast.error(resultado.erro || 'Erro ao transformar consultivo')
      }
    } catch (error) {
      console.error('Erro ao transformar consultivo:', error)
      toast.error('Erro ao transformar consultivo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível', 'trabalhista': 'Trabalhista', 'tributario': 'Tributário',
      'societario': 'Societário', 'contratual': 'Contratual', 'familia': 'Família',
      'consumidor': 'Consumidor', 'ambiental': 'Ambiental', 'imobiliario': 'Imobiliário',
      'propriedade_intelectual': 'Prop. Intelectual', 'outros': 'Outros', 'outra': 'Outra'
    }
    return map[area] || area
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Transformar em Processo</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#34495e]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#34495e]" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#34495e]">Transformar em Processo</h2>
            <p className="text-xs text-slate-500">{consulta.numero} &rarr; Novo Processo</p>
          </div>
        </div>

        {/* Content - 2 colunas */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-5 gap-4 min-h-0">

            {/* Coluna Esquerda - Dados Herdados (2/5) */}
            <div className="col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-[#34495e]">Dados Herdados</span>
              </div>

              {/* Cliente */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Cliente</span>
                </div>
                <p className="text-sm font-semibold text-[#34495e]">{consulta.cliente_nome}</p>
              </div>

              {/* Responsável */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Gavel className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Responsável</span>
                </div>
                <p className="text-sm font-semibold text-[#34495e]">{consulta.responsavel_nome}</p>
              </div>

              {/* Área */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Área Jurídica</span>
                </div>
                <p className="text-sm text-slate-700">{formatArea(consulta.area)}</p>
              </div>

              {/* Objeto (título da consulta) */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Objeto da Ação</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{consulta.titulo}</p>
              </div>

              {/* Contrato */}
              {contratoInfo && (
                <div className="bg-white border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-slate-500">Contrato Vinculado</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                      {contratoInfo.forma_cobranca}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-[#34495e]">{contratoInfo.numero_contrato}</p>
                  {contratoInfo.valor_total && (
                    <p className="text-xs text-slate-500 mt-1">{formatCurrency(contratoInfo.valor_total)}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Checkbox
                      id="manter-contrato"
                      checked={manterContrato}
                      onCheckedChange={(checked) => setManterContrato(!!checked)}
                    />
                    <Label htmlFor="manter-contrato" className="text-xs text-slate-600 cursor-pointer">
                      Manter contrato vinculado ao processo
                    </Label>
                  </div>
                </div>
              )}

              {/* Andamentos */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ListTodo className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">
                    Andamentos ({consulta.andamentos?.length || 0})
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id="migrar-andamentos"
                    checked={migrarAndamentos}
                    onCheckedChange={(checked) => setMigrarAndamentos(!!checked)}
                  />
                  <Label htmlFor="migrar-andamentos" className="text-xs text-slate-600 cursor-pointer">
                    Migrar para movimentações do processo
                  </Label>
                </div>
              </div>

              {/* Arquivar consultivo */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Archive className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Pasta Consultiva</span>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="arquivar-consultivo"
                    checked={arquivarConsultivo}
                    onCheckedChange={(checked) => setArquivarConsultivo(!!checked)}
                  />
                  <Label htmlFor="arquivar-consultivo" className="text-xs text-slate-600 cursor-pointer">
                    Arquivar após transformação
                  </Label>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Dados a Preencher (3/5) */}
            <div className="col-span-3 p-4 bg-white border border-slate-200 rounded-xl space-y-5 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-[#34495e]">Dados do Processo</span>
              </div>

              {/* Número CNJ */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">
                  Número CNJ
                  <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="1234567-12.2024.8.26.0100"
                    value={numeroCnj}
                    onChange={(e) => setNumeroCnj(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBuscarDataJud}
                    disabled={!numeroCnj.trim() || consultandoCNJ}
                    className="shrink-0 gap-2"
                  >
                    {consultandoCNJ ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {consultandoCNJ ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>

              {/* Grid 2 colunas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Tipo *</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="judicial">Judicial</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="arbitragem">Arbitragem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Distribuição */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Data Distribuição *</Label>
                  <Input
                    type="date"
                    value={dataDistribuicao}
                    onChange={(e) => setDataDistribuicao(e.target.value)}
                  />
                </div>

                {/* Polo do Cliente */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Polo do Cliente *</Label>
                  <Select value={poloCliente} onValueChange={setPoloCliente}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Polo Ativo (Autor)</SelectItem>
                      <SelectItem value="passivo">Polo Passivo (Réu)</SelectItem>
                      <SelectItem value="terceiro">Terceiro Interessado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Parte Contrária */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Parte Contrária</Label>
                  <Input
                    placeholder="Nome da parte contrária..."
                    value={parteContraria}
                    onChange={(e) => setParteContraria(e.target.value)}
                  />
                </div>

                {/* Fase */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Fase</Label>
                  <Select value={fase} onValueChange={setFase}>
                    <SelectTrigger>
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

                {/* Instância */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Instância</Label>
                  <Select value={instancia} onValueChange={setInstancia}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1ª">1ª Instância</SelectItem>
                      <SelectItem value="2ª">2ª Instância</SelectItem>
                      <SelectItem value="STJ">STJ</SelectItem>
                      <SelectItem value="STF">STF</SelectItem>
                      <SelectItem value="TST">TST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Localização */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Localização</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Tribunal */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">Tribunal</Label>
                    <Input
                      placeholder="Ex: TJSP, TRT2..."
                      value={tribunal}
                      onChange={(e) => setTribunal(e.target.value)}
                    />
                  </div>

                  {/* UF */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">UF</Label>
                    <Select value={uf} onValueChange={setUf}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(estado => (
                          <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Comarca */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">Comarca</Label>
                    <Input
                      placeholder="Ex: São Paulo"
                      value={comarca}
                      onChange={(e) => setComarca(e.target.value)}
                    />
                  </div>

                  {/* Vara */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">Vara/Câmara</Label>
                    <Input
                      placeholder="Ex: 1ª Vara Cível"
                      value={vara}
                      onChange={(e) => setVara(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Valor da Causa */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Valor da Causa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorCausa}
                  onChange={(e) => setValorCausa(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white rounded-b-lg">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !dataDistribuicao}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transformando...
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
  )
}
