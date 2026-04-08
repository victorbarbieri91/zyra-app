'use client'

import { useState } from 'react'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  UserCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useProcessoPartes,
  type ProcessoParte,
  type NovaParteData,
  getTipoLabel,
} from '@/hooks/useProcessoPartes'

interface ProcessoPartesProps {
  processoId: string
  className?: string
}

type PoloColuna = 'autor' | 'reu' | 'terceiro'

interface FormState {
  polo: PoloColuna | null
  editandoId: string | null
  nome: string
  cpf_cnpj: string
  qualificacao: string
  tipoTerceiro: string
}

const INITIAL_FORM: FormState = {
  polo: null,
  editandoId: null,
  nome: '',
  cpf_cnpj: '',
  qualificacao: '',
  tipoTerceiro: 'terceiro_interessado',
}

const POLO_CONFIG = {
  autor: {
    label: 'Polo Ativo (Autores)',
    badgeClass: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    emptyText: 'Nenhum autor cadastrado',
  },
  reu: {
    label: 'Polo Passivo (Réus)',
    badgeClass: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    emptyText: 'Nenhum réu cadastrado',
  },
  terceiro: {
    label: 'Terceiros / Outros',
    badgeClass: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30',
    emptyText: 'Nenhum terceiro cadastrado',
  },
} as const

const TIPOS_TERCEIRO = [
  { value: 'terceiro_interessado', label: 'Terceiro Interessado' },
  { value: 'assistente', label: 'Assistente' },
  { value: 'opoente', label: 'Opoente' },
  { value: 'denunciado', label: 'Denunciado' },
  { value: 'chamado', label: 'Chamado' },
]

export default function ProcessoPartes({ processoId, className }: ProcessoPartesProps) {
  const {
    autores,
    reus,
    terceiros,
    loading,
    saving,
    adicionarParte,
    editarParte,
    removerParte,
  } = useProcessoPartes(processoId)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const abrirFormNovo = (polo: PoloColuna) => {
    setForm({ ...INITIAL_FORM, polo })
    setConfirmRemove(null)
  }

  const abrirFormEditar = (parte: ProcessoParte) => {
    const polo: PoloColuna = parte.tipo === 'autor' ? 'autor' : parte.tipo === 'reu' ? 'reu' : 'terceiro'
    setForm({
      polo,
      editandoId: parte.id,
      nome: parte.nome,
      cpf_cnpj: parte.cpf_cnpj || '',
      qualificacao: parte.qualificacao || '',
      tipoTerceiro: !['autor', 'reu'].includes(parte.tipo) ? parte.tipo : 'terceiro_interessado',
    })
    setConfirmRemove(null)
  }

  const cancelarForm = () => {
    setForm(INITIAL_FORM)
  }

  const salvarParte = async () => {
    if (!form.nome.trim() || !form.polo) return

    const tipo = form.polo === 'terceiro'
      ? form.tipoTerceiro as NovaParteData['tipo']
      : form.polo

    if (form.editandoId) {
      const ok = await editarParte(form.editandoId, {
        nome: form.nome,
        cpf_cnpj: form.cpf_cnpj || null,
        qualificacao: form.qualificacao || null,
      })
      if (ok) setForm(INITIAL_FORM)
    } else {
      const ok = await adicionarParte({
        tipo,
        nome: form.nome,
        cpf_cnpj: form.cpf_cnpj || null,
        qualificacao: form.qualificacao || null,
      })
      if (ok) setForm(INITIAL_FORM)
    }
  }

  const handleRemover = async (parteId: string) => {
    if (confirmRemove === parteId) {
      await removerParte(parteId)
      setConfirmRemove(null)
    } else {
      setConfirmRemove(parteId)
    }
  }

  const renderParte = (parte: ProcessoParte) => {
    const isEditing = form.editandoId === parte.id

    if (isEditing) return null // O form inline é renderizado separadamente

    return (
      <div
        key={parte.id}
        className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <UserCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {parte.nome}
              </span>
              {parte.cliente_id && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-200 dark:border-teal-700 text-teal-600 dark:text-teal-400">
                  Cliente
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {parte.qualificacao && <span>{parte.qualificacao}</span>}
              {parte.cpf_cnpj && (
                <>
                  {parte.qualificacao && <span>·</span>}
                  <span className="font-mono">{parte.cpf_cnpj}</span>
                </>
              )}
              {!['autor', 'reu'].includes(parte.tipo) && (
                <>
                  {(parte.qualificacao || parte.cpf_cnpj) && <span>·</span>}
                  <span>{getTipoLabel(parte.tipo)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
            onClick={() => abrirFormEditar(parte)}
            disabled={saving}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 p-0',
              confirmRemove === parte.id
                ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                : 'text-slate-400 hover:text-red-500'
            )}
            onClick={() => handleRemover(parte.id)}
            disabled={saving}
          >
            {confirmRemove === parte.id ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
          {confirmRemove === parte.id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400"
              onClick={() => setConfirmRemove(null)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderFormInline = (polo: PoloColuna) => {
    if (form.polo !== polo) return null

    return (
      <div className="mt-2 p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1 space-y-2">
        <div>
          <Input
            placeholder="Nome da parte *"
            value={form.nome}
            onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
            autoFocus
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="CPF/CNPJ"
            value={form.cpf_cnpj}
            onChange={(e) => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Qualificação"
            value={form.qualificacao}
            onChange={(e) => setForm(f => ({ ...f, qualificacao: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        {polo === 'terceiro' && (
          <div>
            <Label className="text-xs text-slate-500">Tipo</Label>
            <Select value={form.tipoTerceiro} onValueChange={(v) => setForm(f => ({ ...f, tipoTerceiro: v }))}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_TERCEIRO.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelarForm}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={salvarParte}
            disabled={!form.nome.trim() || saving}
          >
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {form.editandoId ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    )
  }

  const renderColuna = (polo: PoloColuna, partesList: ProcessoParte[]) => {
    const config = POLO_CONFIG[polo]
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            {config.label}
          </h4>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.badgeClass)}>
            {partesList.length}
          </Badge>
        </div>

        {partesList.length === 0 && form.polo !== polo && (
          <p className="text-xs text-slate-400 italic py-2">{config.emptyText}</p>
        )}

        {partesList.map(renderParte)}

        {/* Form inline aparece no polo correto */}
        {renderFormInline(polo)}

        {/* Botão adicionar — só aparece se não tem form aberto nesse polo */}
        {form.polo !== polo && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-slate-400 hover:text-slate-600 mt-1 border border-dashed border-slate-200 dark:border-slate-700"
            onClick={() => abrirFormNovo(polo)}
            disabled={saving}
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#89bcbe]" />
          Partes do Processo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderColuna('autor', autores)}
          {renderColuna('reu', reus)}
          {renderColuna('terceiro', terceiros)}
        </div>
      </CardContent>
    </Card>
  )
}
