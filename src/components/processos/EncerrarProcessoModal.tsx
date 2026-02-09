'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-picker'
import {
  Archive,
  Loader2,
  AlertTriangle,
  ListTodo,
  Gavel,
  Handshake,
  Scale,
  FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { formatBrazilDate } from '@/lib/timezone'
import {
  PROCESSO_RESULTADO_LABELS,
} from '@/lib/constants/processo-enums'

interface Pendencia {
  id: string
  tipo: 'tarefa' | 'audiencia'
  titulo: string
  data: string
  checked: boolean
}

interface EncerrarProcessoModalProps {
  open: boolean
  onClose: () => void
  processoId: string
  processoNumero: string
  onSuccess: () => void
}

export default function EncerrarProcessoModal({
  open,
  onClose,
  processoId,
  processoNumero,
  onSuccess,
}: EncerrarProcessoModalProps) {
  const supabase = createClient()

  // Campos obrigatórios
  const [dataEncerramento, setDataEncerramento] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Toggles opcionais
  const [houveAcordo, setHouveAcordo] = useState(false)
  const [valorAcordo, setValorAcordo] = useState('')

  const [houveCondenacao, setHouveCondenacao] = useState(false)
  const [valorCondenacao, setValorCondenacao] = useState('')

  const [transitoJulgado, setTransitoJulgado] = useState(false)
  const [dataTransito, setDataTransito] = useState('')

  const [registrarResultado, setRegistrarResultado] = useState(false)
  const [resultado, setResultado] = useState('')

  const [addObservacoes, setAddObservacoes] = useState(false)
  const [observacoes, setObservacoes] = useState('')

  // Pendências
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loadingPendencias, setLoadingPendencias] = useState(true)

  // Submit state
  const [submitting, setSubmitting] = useState(false)

  // Carregar pendências ao abrir
  useEffect(() => {
    if (open && processoId) {
      loadPendencias()
    }
  }, [open, processoId])

  const loadPendencias = async () => {
    setLoadingPendencias(true)
    const items: Pendencia[] = []

    // Buscar tarefas abertas
    const { data: tarefas } = await supabase
      .from('agenda_tarefas')
      .select('id, titulo, data_execucao, prazo_data_limite')
      .eq('processo_id', processoId)
      .in('status', ['pendente', 'em_andamento'])

    if (tarefas) {
      tarefas.forEach(t => {
        items.push({
          id: t.id,
          tipo: 'tarefa',
          titulo: t.titulo || 'Tarefa sem título',
          data: t.prazo_data_limite || t.data_execucao || '',
          checked: true,
        })
      })
    }

    // Buscar audiências futuras
    const { data: audiencias } = await supabase
      .from('agenda_audiencias')
      .select('id, tipo_audiencia, data_hora')
      .eq('processo_id', processoId)
      .eq('status', 'agendada')
      .gte('data_hora', new Date().toISOString())

    if (audiencias) {
      audiencias.forEach(a => {
        const tipoLabel: Record<string, string> = {
          instrucao: 'Instrução',
          julgamento: 'Julgamento',
          conciliacao: 'Conciliação',
          mediacao: 'Mediação',
          inicial: 'Inicial',
          continuacao: 'Continuação',
          una: 'UNA',
        }
        items.push({
          id: a.id,
          tipo: 'audiencia',
          titulo: `Audiência de ${tipoLabel[a.tipo_audiencia] || a.tipo_audiencia}`,
          data: a.data_hora || '',
          checked: true,
        })
      })
    }

    setPendencias(items)
    setLoadingPendencias(false)
  }

  const togglePendencia = (id: string) => {
    setPendencias(prev =>
      prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p)
    )
  }

  // Inferir status automaticamente
  const getInferredStatus = (): string => {
    if (houveAcordo) return 'acordo'
    if (transitoJulgado) return 'transito_julgado'
    return 'arquivado'
  }

  const parseCurrencyValue = (val: string): number | null => {
    if (!val.trim()) return null
    const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      // 1. Buscar user id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSubmitting(false)
        return
      }

      // 2. Montar update do processo
      const updateData: Record<string, unknown> = {
        status: getInferredStatus(),
        data_encerramento: dataEncerramento,
        data_arquivamento: dataEncerramento,
        encerrado_por: user.id,
        encerrado_em: new Date().toISOString(),
      }

      if (houveAcordo) {
        const val = parseCurrencyValue(valorAcordo)
        if (val !== null) updateData.valor_acordo = val
      }

      if (houveCondenacao) {
        const val = parseCurrencyValue(valorCondenacao)
        if (val !== null) updateData.valor_condenacao = val
      }

      if (transitoJulgado && dataTransito) {
        updateData.data_transito_julgado = dataTransito
      }

      if (registrarResultado && resultado) {
        updateData.resultado = resultado
      }

      if (addObservacoes && observacoes.trim()) {
        updateData.resumo_encerramento = observacoes.trim()
      }

      // 3. Atualizar processo
      const { error: updateError } = await supabase
        .from('processos_processos')
        .update(updateData)
        .eq('id', processoId)

      if (updateError) {
        console.error('Erro ao encerrar processo:', updateError)
        setSubmitting(false)
        return
      }

      // 4. Cancelar pendências marcadas
      const tarefasParaCancelar = pendencias
        .filter(p => p.tipo === 'tarefa' && p.checked)
        .map(p => p.id)

      const audienciasParaCancelar = pendencias
        .filter(p => p.tipo === 'audiencia' && p.checked)
        .map(p => p.id)

      if (tarefasParaCancelar.length > 0) {
        await supabase
          .from('agenda_tarefas')
          .update({ status: 'cancelada' })
          .in('id', tarefasParaCancelar)
      }

      if (audienciasParaCancelar.length > 0) {
        await supabase
          .from('agenda_audiencias')
          .update({ status: 'cancelada' })
          .in('id', audienciasParaCancelar)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao encerrar processo:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = (() => {
    const s = getInferredStatus()
    const map: Record<string, string> = {
      acordo: 'Acordo',
      transito_julgado: 'Trânsito em Julgado',
      arquivado: 'Arquivado',
    }
    return map[s] || s
  })()

  const pendenciasChecadas = pendencias.filter(p => p.checked).length

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Archive className="w-5 h-5" />
            Encerrar Processo {processoNumero}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Encerrar processo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Data do encerramento */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#34495e]">
              Data do encerramento
            </Label>
            <DateInput
              value={dataEncerramento}
              onChange={setDataEncerramento}
            />
          </div>

          {/* Seção de toggles opcionais */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#46627f] uppercase tracking-wide">
              Informações opcionais
            </p>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">

              {/* Toggle: Acordo */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
                    <Handshake className="w-4 h-4 text-teal-500" />
                    Houve acordo
                  </Label>
                  <Switch checked={houveAcordo} onCheckedChange={setHouveAcordo} />
                </div>
                {houveAcordo && (
                  <div className="pl-6">
                    <Label className="text-xs text-slate-500">Valor do acordo</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={valorAcordo}
                      onChange={(e) => setValorAcordo(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Toggle: Condenação */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
                    <Scale className="w-4 h-4 text-blue-500" />
                    Houve condenação
                  </Label>
                  <Switch checked={houveCondenacao} onCheckedChange={setHouveCondenacao} />
                </div>
                {houveCondenacao && (
                  <div className="pl-6">
                    <Label className="text-xs text-slate-500">Valor da condenação</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={valorCondenacao}
                      onChange={(e) => setValorCondenacao(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Toggle: Trânsito em Julgado */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
                    <Gavel className="w-4 h-4 text-purple-500" />
                    Trânsito em julgado
                  </Label>
                  <Switch checked={transitoJulgado} onCheckedChange={setTransitoJulgado} />
                </div>
                {transitoJulgado && (
                  <div className="pl-6">
                    <Label className="text-xs text-slate-500">Data do trânsito</Label>
                    <div className="mt-1">
                      <DateInput
                        value={dataTransito}
                        onChange={setDataTransito}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle: Resultado */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Registrar resultado
                  </Label>
                  <Switch checked={registrarResultado} onCheckedChange={setRegistrarResultado} />
                </div>
                {registrarResultado && (
                  <div className="pl-6 mt-1">
                    <Select value={resultado} onValueChange={setResultado}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROCESSO_RESULTADO_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Toggle: Observações */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
                    <ListTodo className="w-4 h-4 text-slate-500" />
                    Observações
                  </Label>
                  <Switch checked={addObservacoes} onCheckedChange={setAddObservacoes} />
                </div>
                {addObservacoes && (
                  <div className="pl-6 mt-1">
                    <Textarea
                      placeholder="Resumo do encerramento, notas relevantes..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pendências */}
          {loadingPendencias ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando pendências...
            </div>
          ) : pendencias.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-medium text-[#46627f] uppercase tracking-wide">
                  Pendências encontradas ({pendencias.length})
                </p>
              </div>
              <div className="border border-amber-200 bg-amber-50/50 rounded-lg divide-y divide-amber-100">
                {pendencias.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-amber-50"
                    onClick={() => togglePendencia(p.id)}
                  >
                    <Checkbox
                      checked={p.checked}
                      onCheckedChange={() => togglePendencia(p.id)}
                      className="border-amber-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={`text-[9px] border ${
                            p.tipo === 'tarefa'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-purple-50 text-purple-600 border-purple-200'
                          }`}
                        >
                          {p.tipo === 'tarefa' ? 'Tarefa' : 'Audiência'}
                        </Badge>
                        <span className="text-xs text-slate-700 truncate">{p.titulo}</span>
                      </div>
                    </div>
                    {p.data && (
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {formatBrazilDate(p.data)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-600">
                As {pendenciasChecadas} pendência{pendenciasChecadas !== 1 ? 's' : ''} marcada{pendenciasChecadas !== 1 ? 's' : ''} será{pendenciasChecadas !== 1 ? 'ão' : ''} cancelada{pendenciasChecadas !== 1 ? 's' : ''} automaticamente.
              </p>
            </div>
          )}

          {/* Status inferido */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <span>Status final:</span>
            <Badge className="text-[10px] bg-slate-200 text-slate-700 border-0">
              {statusLabel}
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !dataEncerramento}
            className="bg-[#34495e] hover:bg-[#2c3e50] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Encerrando...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Encerrar Processo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
