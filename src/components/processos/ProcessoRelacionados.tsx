'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  GitBranch,
  Plus,
  ExternalLink,
  Trash2,
  Loader2,
  ArrowUpRight,
  Search,
  Link2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  PROCESSO_INSTANCIA_LABELS,
  PROCESSO_STATUS_LABELS,
} from '@/lib/constants/processo-enums'
import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'
import {
  useProcessoRelacionados,
  type ProcessoRelacionado,
} from '@/hooks/useProcessoRelacionados'
import ProcessoDerivadoWizard, { type ProcessoPrincipalData } from './ProcessoDerivadoWizard'

interface Props {
  processoId: string
  processoPrincipalData: ProcessoPrincipalData
  /**
   * Quando true, o card não renderiza quando não há nenhum vínculo
   * (principal, recursos ou incidentes). Útil para usar inline no resumo.
   */
  autoHide?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-700',
  suspenso: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-700',
  arquivado: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-surface-2 dark:text-slate-400 dark:border-slate-700',
  baixado: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-700',
  transito_julgado: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-700',
  acordo: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-700',
}

const TIPO_COLORS: Record<string, string> = {
  recurso: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-700',
  incidente: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-700',
}

function ProcessoRow({
  rel,
  onRemover,
  removing,
}: {
  rel: ProcessoRelacionado
  onRemover: () => void
  removing: boolean
}) {
  const router = useRouter()
  const statusLabel = PROCESSO_STATUS_LABELS[rel.processo.status] ?? rel.processo.status
  const statusColor = STATUS_COLORS[rel.processo.status] ?? 'bg-slate-100 text-slate-600'
  const instanciaLabel =
    PROCESSO_INSTANCIA_LABELS[rel.processo.instancia] ?? rel.processo.instancia
  const areaLabel =
    AREA_JURIDICA_LABELS[rel.processo.area as keyof typeof AREA_JURIDICA_LABELS] ??
    rel.processo.area
  const tipoLabel = rel.tipo === 'recurso' ? 'Recurso' : 'Incidente'
  const tipoColor = TIPO_COLORS[rel.tipo] ?? 'bg-slate-100 text-slate-600'

  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors">
      {/* Tipo badge */}
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 border shrink-0 ${tipoColor}`}
      >
        {tipoLabel}
      </Badge>

      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-semibold text-[#34495e] dark:text-slate-200 truncate">
          {rel.processo.numero_cnj || rel.processo.numero_pasta}
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 border ${statusColor}`}
        >
          {statusLabel}
        </Badge>
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
          {instanciaLabel} · {areaLabel}
        </span>
      </div>

      {/* Ações (aparecem no hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-[#46627f] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 hover:bg-[#f0f9f9] dark:hover:bg-teal-900/20"
          onClick={() => router.push(`/dashboard/processos/${rel.processo.id}`)}
          title="Abrir processo"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              disabled={removing}
              title="Remover vínculo"
            >
              {removing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
              <AlertDialogDescription>
                O processo{' '}
                <span className="font-mono font-semibold">
                  {rel.processo.numero_cnj || rel.processo.numero_pasta}
                </span>{' '}
                continuará existindo, mas deixará de estar vinculado a este processo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onRemover} className="bg-red-600 hover:bg-red-700">
                Remover vínculo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// Modal para vincular processo existente
function VincularExistenteModal({
  open,
  onClose,
  processoAtualId,
  onVincular,
  saving,
}: {
  open: boolean
  onClose: () => void
  processoAtualId: string
  onVincular: (destinoId: string, tipo: 'recurso' | 'incidente') => Promise<boolean>
  saving: boolean
}) {
  const supabase = createClient()
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<'recurso' | 'incidente'>('recurso')
  const [resultados, setResultados] = useState<
    Array<{ id: string; numero_cnj: string; numero_pasta: string; autor: string; reu: string; instancia: string }>
  >([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (!open) {
      setBusca('')
      setResultados([])
      setSelecionado(null)
    }
  }, [open])

  useEffect(() => {
    if (busca.length < 3) {
      setResultados([])
      return
    }
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await supabase
          .from('v_processos_com_movimentacoes')
          .select('id, numero_cnj, numero_pasta')
          .neq('id', processoAtualId)
          .or(`numero_cnj.ilike.%${busca}%,numero_pasta.ilike.%${busca}%`)
          .limit(10)

        const ids = (data || []).map((d: Record<string, unknown>) => d.id as string)
        if (ids.length === 0) {
          setResultados([])
          return
        }

        const { data: processos } = await supabase
          .from('processos_processos')
          .select('id, numero_cnj, numero_pasta, autor, reu, instancia')
          .in('id', ids)

        setResultados(
          (processos || []).map((p: Record<string, string | null>) => ({
            id: p.id ?? '',
            numero_cnj: p.numero_cnj ?? '',
            numero_pasta: p.numero_pasta ?? '',
            autor: p.autor ?? '',
            reu: p.reu ?? '',
            instancia: p.instancia ?? '',
          }))
        )
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busca, processoAtualId])

  const handleConfirmar = async () => {
    if (!selecionado) {
      toast.error('Selecione um processo')
      return
    }
    const ok = await onVincular(selecionado, tipo)
    if (ok) {
      toast.success('Processo vinculado com sucesso!')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <Link2 className="w-4 h-4 text-[#89bcbe]" />
            Vincular processo existente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo de vínculo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'recurso' | 'incidente')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recurso">Recurso</SelectItem>
                <SelectItem value="incidente">Incidente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Buscar processo</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Nº CNJ ou nº pasta..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setSelecionado(null)
                }}
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>
          </div>

          {resultados.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
              {resultados.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    selecionado === r.id ? 'bg-[#f0f9f9] dark:bg-teal-900/20' : 'hover:bg-slate-50 dark:hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="radio"
                    name="processo_vincular"
                    value={r.id}
                    checked={selecionado === r.id}
                    onChange={() => setSelecionado(r.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#34495e] dark:text-slate-200">
                      {r.numero_cnj || r.numero_pasta}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.autor} x {r.reu} ·{' '}
                      {PROCESSO_INSTANCIA_LABELS[r.instancia] ?? r.instancia}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {busca.length >= 3 && !buscando && resultados.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
              Nenhum processo encontrado
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!selecionado || saving}
            className="bg-[#34495e] hover:bg-[#46627f]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Vincular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function ProcessoRelacionados({ processoId, processoPrincipalData, autoHide = false }: Props) {
  const router = useRouter()
  const {
    principal,
    recursos,
    incidentes,
    loading,
    saving,
    loadRelacionados,
    criarProcessoRelacionado,
    vincularProcessoExistente,
    removerRelacionamento,
  } = useProcessoRelacionados(processoId)

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState<'recurso' | 'incidente' | null>(null)
  const [showVincular, setShowVincular] = useState(false)

  useEffect(() => {
    loadRelacionados()
  }, [processoId])

  const handleRemover = async (rel: ProcessoRelacionado) => {
    setRemovingId(rel.relacionamentoId)
    await removerRelacionamento(rel.relacionamentoId)
    setRemovingId(null)
  }

  const handleCriar = async (params: Parameters<typeof criarProcessoRelacionado>[0]) => {
    const id = await criarProcessoRelacionado(params)
    if (id) {
      setShowWizard(null)
      toast.success(`${showWizard === 'recurso' ? 'Recurso' : 'Incidente'} criado!`)
    }
    return id
  }

  const todosFilhos = [...recursos, ...incidentes]
  const temRelacionados = !!principal || todosFilhos.length > 0

  // Collapsible: aberto quando tem dados, fechado quando vazio
  const [expanded, setExpanded] = useState(temRelacionados)

  // Atualiza o estado quando os dados carregam
  useEffect(() => {
    if (!loading) {
      setExpanded(temRelacionados)
    }
  }, [loading, temRelacionados])

  const headerContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ChevronRight className={`w-4 h-4 text-[#46627f] dark:text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <div className="w-7 h-7 rounded-lg bg-white dark:bg-surface-0 border border-[#89bcbe]/30 flex items-center justify-center shadow-sm">
          <GitBranch className="w-3.5 h-3.5 text-[#89bcbe]" />
        </div>
        <span className="text-sm font-medium text-[#34495e] dark:text-slate-200">
          Processos Vinculados
        </span>
        {todosFilhos.length > 0 && (
          <Badge className="bg-[#89bcbe] text-white text-[10px] px-1.5 py-0">
            {todosFilhos.length}
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            className="h-7 text-xs text-[#46627f] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 hover:bg-[#f0f9f9] dark:hover:bg-teal-900/20 gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setShowWizard('recurso')}>
            <GitBranch className="w-3.5 h-3.5 mr-2 text-blue-500" />
            Novo Recurso
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowWizard('incidente')}>
            <GitBranch className="w-3.5 h-3.5 mr-2 text-violet-500" />
            Novo Incidente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowVincular(true)}>
            <Link2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
            Vincular existente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full px-6 py-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] dark:from-teal-500/5 dark:to-teal-500/10 hover:from-[#e8f5f5] hover:to-[#dcefef] dark:hover:from-teal-500/10 dark:hover:to-teal-500/15 transition-colors border-b border-slate-100 dark:border-slate-800"
          >
            {headerContent}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pt-5 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            ) : !temRelacionados ? (
              <div className="text-center py-5 text-slate-400 dark:text-slate-500 space-y-1">
                <GitBranch className="w-7 h-7 mx-auto opacity-25" />
                <p className="text-xs">Nenhum processo vinculado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Processo Principal */}
                {principal && (
                  <div
                    className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#f0f9f9] dark:bg-teal-900/20 border border-[#aacfd0] dark:border-teal-700 cursor-pointer hover:border-[#89bcbe] dark:hover:border-teal-500 transition-colors mb-2"
                    onClick={() => router.push(`/dashboard/processos/${principal.processo.id}`)}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#89bcbe] shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-[#46627f] dark:text-slate-400">Principal</span>
                      <span className="font-mono text-sm font-semibold text-[#34495e] dark:text-slate-200 truncate">
                        {principal.processo.numero_cnj || principal.processo.numero_pasta}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 border ${
                          STATUS_COLORS[principal.processo.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {PROCESSO_STATUS_LABELS[principal.processo.status] ?? principal.processo.status}
                      </Badge>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#89bcbe] shrink-0" />
                  </div>
                )}

                {/* Recursos e Incidentes em lista unificada */}
                {todosFilhos.length > 0 && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {todosFilhos.map((rel) => (
                      <ProcessoRow
                        key={rel.relacionamentoId}
                        rel={rel}
                        onRemover={() => handleRemover(rel)}
                        removing={removingId === rel.relacionamentoId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Wizard de novo processo derivado */}
      {showWizard && (
        <ProcessoDerivadoWizard
          open={!!showWizard}
          onClose={() => setShowWizard(null)}
          tipoRelacao={showWizard}
          processoPrincipal={processoPrincipalData}
          onConfirm={handleCriar}
          saving={saving}
        />
      )}

      {/* Modal vincular existente */}
      <VincularExistenteModal
        open={showVincular}
        onClose={() => setShowVincular(false)}
        processoAtualId={processoId}
        onVincular={vincularProcessoExistente}
        saving={saving}
      />
    </Card>
  )
}
