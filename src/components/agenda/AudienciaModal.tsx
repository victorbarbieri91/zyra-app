'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckSquare,
  Bell,
  Briefcase,
  MapPin,
  Video,
  Save,
  X,
  ClipboardList,
  Users,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ChecklistEditor, { ChecklistItem } from './ChecklistEditor'
import LembretesEditor, { Lembrete } from './LembretesEditor'
import VinculacaoSelector, { Vinculacao } from './VinculacaoSelector'
import { useAudiencias, Audiencia } from '@/hooks/useAudiencias'

interface AudienciaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  audiencia?: Audiencia | null
  escritorioId: string | null
  // Props de pré-preenchimento (para criar nova audiência com dados iniciais)
  processoIdPadrao?: string
  descricaoPadrao?: string
}

const TIPO_AUDIENCIA_CONFIG = {
  inicial: { label: 'Inicial', color: 'blue' },
  instrucao: { label: 'Instrução e Julgamento', color: 'purple' },
  conciliacao: { label: 'Conciliação', color: 'emerald' },
  julgamento: { label: 'Julgamento', color: 'red' },
  una: { label: 'Audiência Única (Una)', color: 'amber' },
  outra: { label: 'Outra', color: 'slate' },
}

export default function AudienciaModal({
  open,
  onOpenChange,
  audiencia,
  escritorioId,
  processoIdPadrao,
  descricaoPadrao,
}: AudienciaModalProps) {
  const { createAudiencia, updateAudiencia } = useAudiencias()

  const [activeTab, setActiveTab] = useState('basico')
  const [saving, setSaving] = useState(false)

  // Campos básicos
  const [processoId, setProcessoId] = useState(processoIdPadrao || '')
  const [tipoAudiencia, setTipoAudiencia] = useState<Audiencia['tipo_audiencia']>('inicial')
  const [modalidade, setModalidade] = useState<Audiencia['modalidade']>('presencial')
  const [dataHora, setDataHora] = useState('')
  const [duracao, setDuracao] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Localização (presencial)
  const [tribunal, setTribunal] = useState('')
  const [comarca, setComarca] = useState('')
  const [vara, setVara] = useState('')
  const [endereco, setEndereco] = useState('')

  // Virtual
  const [linkVirtual, setLinkVirtual] = useState('')
  const [plataforma, setPlataforma] = useState('')
  const [instrucoes, setInstrucoes] = useState('')

  // Participantes
  const [juiz, setJuiz] = useState('')
  const [promotor, setPromotor] = useState('')
  const [parteContraria, setParteContraria] = useState('')
  const [advogadoContrario, setAdvogadoContrario] = useState('')
  const [testemunhas, setTestemunhas] = useState('')

  // Preparação
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  // Vinculação
  const [vinculacao, setVinculacao] = useState<Vinculacao | null>(null)

  // Lembretes
  const [lembretes, setLembretes] = useState<Lembrete[]>([])

  useEffect(() => {
    if (audiencia) {
      setProcessoId(audiencia.processo_id || '')
      setTipoAudiencia(audiencia.tipo_audiencia)
      setModalidade(audiencia.modalidade)
      setDataHora(audiencia.data_hora?.substring(0, 16) || '')
      setDuracao(audiencia.duracao_estimada_minutos?.toString() || '')
      setObservacoes(audiencia.observacoes || '')
      setTribunal(audiencia.tribunal || '')
      setComarca(audiencia.comarca || '')
      setVara(audiencia.vara || '')
      setEndereco(audiencia.endereco || '')
      setLinkVirtual(audiencia.link_virtual || '')
      setPlataforma(audiencia.plataforma || '')
      setInstrucoes(audiencia.instrucoes_acesso || '')
      setJuiz(audiencia.juiz || '')
      setPromotor(audiencia.promotor || '')
      setParteContraria(audiencia.parte_contraria || '')
      setAdvogadoContrario(audiencia.advogado_contrario || '')
      setTestemunhas(audiencia.testemunhas || '')
    } else {
      resetForm()
      // Aplicar valores padrão se fornecidos
      if (descricaoPadrao) setObservacoes(descricaoPadrao)
    }
  }, [audiencia, descricaoPadrao])

  const resetForm = () => {
    setProcessoId(processoIdPadrao || '')
    setTipoAudiencia('inicial')
    setModalidade('presencial')
    setDataHora('')
    setDuracao('')
    setObservacoes('')
    setTribunal('')
    setComarca('')
    setVara('')
    setEndereco('')
    setLinkVirtual('')
    setPlataforma('')
    setInstrucoes('')
    setJuiz('')
    setPromotor('')
    setParteContraria('')
    setAdvogadoContrario('')
    setTestemunhas('')
    setChecklist([])
    setVinculacao(null)
    setLembretes([])
    setActiveTab('basico')
  }

  const handleSave = async () => {
    // Validar vinculação ou processoIdPadrao
    if (!vinculacao && !processoId) {
      alert('É necessário vincular a um processo ou consultivo')
      setActiveTab('vinculacoes')
      return
    }

    if (!dataHora) {
      alert('Data e hora são obrigatórias')
      return
    }

    if (modalidade === 'presencial' && !tribunal) {
      alert('Para audiências presenciais, informe o tribunal')
      setActiveTab('localizacao')
      return
    }

    if (modalidade === 'virtual' && !linkVirtual) {
      alert('Para audiências virtuais, informe o link')
      setActiveTab('localizacao')
      return
    }

    setSaving(true)

    try {
      const audienciaData: Partial<Audiencia> = {
        escritorio_id: escritorioId,
        // Vinculação - usar vinculação ou processoId direto (retrocompatibilidade)
        processo_id: vinculacao?.modulo === 'processo' ? vinculacao.modulo_registro_id : processoId || null,
        consultivo_id: vinculacao?.modulo === 'consultivo' ? vinculacao.modulo_registro_id : null,
        tipo_audiencia: tipoAudiencia,
        modalidade,
        data_hora: dataHora,
        duracao_estimada_minutos: duracao ? parseInt(duracao) : null,
        observacoes: observacoes || null,
        // Presencial
        tribunal: modalidade === 'presencial' ? tribunal : null,
        comarca: modalidade === 'presencial' ? comarca || null : null,
        vara: modalidade === 'presencial' ? vara || null : null,
        endereco: modalidade === 'presencial' ? endereco || null : null,
        // Virtual
        link_virtual: modalidade === 'virtual' ? linkVirtual : null,
        plataforma: modalidade === 'virtual' ? plataforma || null : null,
        instrucoes_acesso: modalidade === 'virtual' ? instrucoes || null : null,
        // Participantes
        juiz: juiz || null,
        promotor: promotor || null,
        parte_contraria: parteContraria || null,
        advogado_contrario: advogadoContrario || null,
        testemunhas: testemunhas || null,
      }

      if (audiencia?.id) {
        await updateAudiencia(audiencia.id, audienciaData)
      } else {
        await createAudiencia(audienciaData)
      }

      // TODO: Salvar checklist e lembretes

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar audiência:', error)
      alert('Erro ao salvar audiência')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#34495e] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#89bcbe]" />
            {audiencia ? 'Editar Audiência' : 'Nova Audiência'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="basico" className="text-xs">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="localizacao" className="text-xs">
              {modalidade === 'presencial' ? (
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Video className="w-3.5 h-3.5 mr-1.5" />
              )}
              Local
            </TabsTrigger>
            <TabsTrigger value="participantes" className="text-xs">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Participantes
            </TabsTrigger>
            <TabsTrigger value="vinculacoes" className="text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Vínculos
            </TabsTrigger>
            <TabsTrigger value="preparacao" className="text-xs">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              Preparação
            </TabsTrigger>
            <TabsTrigger value="lembretes" className="text-xs">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Lembretes
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* ABA BÁSICO */}
            <TabsContent value="basico" className="space-y-4 mt-0">
              {/* Processo */}
              <div className="space-y-2">
                <Label htmlFor="processo" className="text-sm font-medium text-[#46627f]">
                  Processo * <span className="text-xs text-slate-500">(CNJ)</span>
                </Label>
                <Input
                  id="processo"
                  value={processoId}
                  onChange={(e) => setProcessoId(e.target.value)}
                  placeholder="Ex: 0000000-00.0000.0.00.0000"
                  className="border-slate-200"
                  disabled={!!processoIdPadrao}
                />
                {/* TODO: Implementar autocomplete de processos */}
              </div>

              {/* Tipo de Audiência */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#46627f]">Tipo de Audiência *</Label>
                <Select value={tipoAudiencia} onValueChange={(value: any) => setTipoAudiencia(value)}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_AUDIENCIA_CONFIG) as [Audiencia['tipo_audiencia'], typeof TIPO_AUDIENCIA_CONFIG[keyof typeof TIPO_AUDIENCIA_CONFIG]][]).map(
                      ([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Modalidade */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#46627f]">Modalidade *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalidade('presencial')}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                      modalidade === 'presencial'
                        ? 'border-[#89bcbe] bg-[#89bcbe]/10 text-[#34495e]'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <MapPin className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Presencial</p>
                      <p className="text-xs text-slate-500">No tribunal</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalidade('virtual')}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                      modalidade === 'virtual'
                        ? 'border-[#89bcbe] bg-[#89bcbe]/10 text-[#34495e]'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <Video className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Virtual</p>
                      <p className="text-xs text-slate-500">Por videoconferência</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Data/Hora e Duração */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="data_hora" className="text-sm font-medium text-[#46627f]">
                    Data e Hora *
                  </Label>
                  <Input
                    id="data_hora"
                    type="datetime-local"
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracao" className="text-sm font-medium text-[#46627f]">
                    Duração (minutos)
                  </Label>
                  <Input
                    id="duracao"
                    type="number"
                    min="0"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    placeholder="60"
                    className="border-slate-200"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm font-medium text-[#46627f]">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Detalhes sobre a audiência..."
                  rows={3}
                  className="border-slate-200"
                />
              </div>
            </TabsContent>

            {/* ABA LOCALIZAÇÃO */}
            <TabsContent value="localizacao" className="space-y-4 mt-0">
              {modalidade === 'presencial' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tribunal" className="text-sm font-medium text-[#46627f]">
                      Tribunal *
                    </Label>
                    <Input
                      id="tribunal"
                      value={tribunal}
                      onChange={(e) => setTribunal(e.target.value)}
                      placeholder="Ex: Tribunal de Justiça de São Paulo"
                      className="border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="comarca" className="text-sm font-medium text-[#46627f]">
                        Comarca
                      </Label>
                      <Input
                        id="comarca"
                        value={comarca}
                        onChange={(e) => setComarca(e.target.value)}
                        placeholder="Ex: São Paulo"
                        className="border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vara" className="text-sm font-medium text-[#46627f]">
                        Vara
                      </Label>
                      <Input
                        id="vara"
                        value={vara}
                        onChange={(e) => setVara(e.target.value)}
                        placeholder="Ex: 1ª Vara Cível"
                        className="border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco" className="text-sm font-medium text-[#46627f]">
                      Endereço Completo
                    </Label>
                    <Textarea
                      id="endereco"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua, número, complemento, bairro, cidade, UF, CEP"
                      rows={2}
                      className="border-slate-200"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="link_virtual" className="text-sm font-medium text-[#46627f]">
                      Link da Reunião *
                    </Label>
                    <Input
                      id="link_virtual"
                      type="url"
                      value={linkVirtual}
                      onChange={(e) => setLinkVirtual(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plataforma" className="text-sm font-medium text-[#46627f]">
                      Plataforma
                    </Label>
                    <Select value={plataforma} onValueChange={setPlataforma}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                        <SelectItem value="pje">PJe Videoconferência</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instrucoes" className="text-sm font-medium text-[#46627f]">
                      Instruções de Acesso
                    </Label>
                    <Textarea
                      id="instrucoes"
                      value={instrucoes}
                      onChange={(e) => setInstrucoes(e.target.value)}
                      placeholder="Ex: Código de acesso, senha, instruções especiais..."
                      rows={3}
                      className="border-slate-200"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {/* ABA PARTICIPANTES */}
            <TabsContent value="participantes" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="juiz" className="text-sm font-medium text-[#46627f]">
                  Juiz(a)
                </Label>
                <Input
                  id="juiz"
                  value={juiz}
                  onChange={(e) => setJuiz(e.target.value)}
                  placeholder="Nome do(a) juiz(a)"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotor" className="text-sm font-medium text-[#46627f]">
                  Promotor(a) / Procurador(a)
                </Label>
                <Input
                  id="promotor"
                  value={promotor}
                  onChange={(e) => setPromotor(e.target.value)}
                  placeholder="Nome do(a) promotor(a)"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parte_contraria" className="text-sm font-medium text-[#46627f]">
                  Parte Contrária
                </Label>
                <Input
                  id="parte_contraria"
                  value={parteContraria}
                  onChange={(e) => setParteContraria(e.target.value)}
                  placeholder="Nome da parte contrária"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advogado_contrario" className="text-sm font-medium text-[#46627f]">
                  Advogado(a) da Parte Contrária
                </Label>
                <Input
                  id="advogado_contrario"
                  value={advogadoContrario}
                  onChange={(e) => setAdvogadoContrario(e.target.value)}
                  placeholder="Nome e OAB"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testemunhas" className="text-sm font-medium text-[#46627f]">
                  Testemunhas
                </Label>
                <Textarea
                  id="testemunhas"
                  value={testemunhas}
                  onChange={(e) => setTestemunhas(e.target.value)}
                  placeholder="Lista de testemunhas (uma por linha)"
                  rows={4}
                  className="border-slate-200"
                />
              </div>
            </TabsContent>

            {/* ABA VINCULAÇÕES */}
            <TabsContent value="vinculacoes" className="mt-0">
              <VinculacaoSelector
                vinculacao={vinculacao}
                onChange={setVinculacao}
              />
            </TabsContent>

            {/* ABA PREPARAÇÃO */}
            <TabsContent value="preparacao" className="mt-0">
              <ChecklistEditor items={checklist} onChange={setChecklist} />
            </TabsContent>

            {/* ABA LEMBRETES */}
            <TabsContent value="lembretes" className="mt-0">
              <LembretesEditor lembretes={lembretes} onChange={setLembretes} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-slate-200"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#5a9a9c] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : audiencia ? 'Salvar Alterações' : 'Criar Audiência'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
