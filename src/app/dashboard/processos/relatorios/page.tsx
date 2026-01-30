'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Users,
  Sparkles,
  Download,
  Check,
  Loader2,
  RefreshCw,
  Save,
  FolderOpen,
  Image,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ColumnSelector } from '@/components/relatorios/ColumnSelector'
import { ClientSelector } from '@/components/relatorios/ClientSelector'
import { ProcessoResumoCard } from '@/components/relatorios/ProcessoResumoCard'
import {
  COLUNAS_PADRAO,
  COLUNAS_DISPONIVEIS,
  WizardState,
  WIZARD_STATE_INICIAL,
  ProcessoParaRelatorio,
  ClienteParaRelatorio,
  RelatorioTemplate
} from '@/types/relatorios'
import { cn } from '@/lib/utils'

type WizardStep = 'colunas' | 'clientes' | 'revisao' | 'download'

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'colunas', label: 'Colunas', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { key: 'clientes', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
  { key: 'revisao', label: 'Revisar', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'download', label: 'Download', icon: <Download className="w-4 h-4" /> },
]

export default function RelatoriosPage() {
  const router = useRouter()
  const supabase = createClient()

  // Estado do wizard
  const [step, setStep] = useState<WizardStep>('colunas')
  const [colunas, setColunas] = useState<string[]>(COLUNAS_PADRAO)
  const [incluirLogo, setIncluirLogo] = useState(true)
  const [clientesSelecionados, setClientesSelecionados] = useState<ClienteParaRelatorio[]>([])
  const [processos, setProcessos] = useState<ProcessoParaRelatorio[]>([])
  const [resumos, setResumos] = useState<Record<string, string>>({})
  const [salvarAndamentos, setSalvarAndamentos] = useState(true)

  // Estados de loading
  const [carregandoProcessos, setCarregandoProcessos] = useState(false)
  const [gerandoResumos, setGerandoResumos] = useState(false)
  const [gerandoExcel, setGerandoExcel] = useState(false)
  const [resumosEmGeracao, setResumosEmGeracao] = useState<Set<string>>(new Set())
  const [atualizandoTodosEscavador, setAtualizandoTodosEscavador] = useState(false)

  // Estados de templates
  const [templates, setTemplates] = useState<RelatorioTemplate[]>([])
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('')
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [salvandoTemplate, setSalvandoTemplate] = useState(false)

  // Estado do resultado
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null)
  const [arquivoNome, setArquivoNome] = useState<string | null>(null)
  const [relatorioId, setRelatorioId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // IDs do usuario
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Carregar dados do usuario
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadUserData()
  }, [supabase])

  // Carregar templates
  useEffect(() => {
    if (!escritorioId) return

    const loadTemplates = async () => {
      const { data } = await supabase
        .from('relatorios_templates')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .eq('ativo', true)
        .order('nome')

      if (data) setTemplates(data)
    }
    loadTemplates()
  }, [escritorioId, supabase])

  // Aplicar template selecionado
  useEffect(() => {
    if (!templateSelecionado) return
    const template = templates.find(t => t.id === templateSelecionado)
    if (template) {
      setColunas(template.colunas)
      setIncluirLogo(template.incluir_logo)
    }
  }, [templateSelecionado, templates])

  // Carregar processos quando clientes sao selecionados
  const carregarProcessos = useCallback(async () => {
    if (!escritorioId || clientesSelecionados.length === 0) {
      setProcessos([])
      return
    }

    setCarregandoProcessos(true)
    try {
      const clientesIds = clientesSelecionados.map(c => c.id)

      const { data, error } = await supabase
        .from('processos_processos')
        .select(`
          id,
          numero_pasta,
          numero_cnj,
          area,
          fase,
          instancia,
          tribunal,
          vara,
          comarca,
          status,
          autor,
          reu,
          parte_contraria,
          polo_cliente,
          valor_causa,
          valor_atualizado,
          data_distribuicao,
          objeto_acao,
          cliente_id,
          crm_pessoas!processos_processos_cliente_id_fkey(nome_completo),
          profiles!processos_processos_responsavel_id_fkey(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .in('cliente_id', clientesIds)
        .neq('status', 'arquivado')
        .order('numero_pasta', { ascending: false })

      if (error) throw error

      const processosFormatados: ProcessoParaRelatorio[] = (data || []).map((p: any) => ({
        id: p.id,
        numero_pasta: p.numero_pasta,
        numero_cnj: p.numero_cnj,
        area: p.area,
        fase: p.fase,
        instancia: p.instancia,
        tribunal: p.tribunal,
        vara: p.vara,
        comarca: p.comarca,
        status: p.status,
        autor: p.autor,
        reu: p.reu,
        parte_contraria: p.parte_contraria,
        polo_cliente: p.polo_cliente,
        valor_causa: p.valor_causa,
        valor_atualizado: p.valor_atualizado,
        data_distribuicao: p.data_distribuicao,
        objeto_acao: p.objeto_acao,
        cliente_id: p.cliente_id,
        cliente_nome: (p.crm_pessoas as any)?.nome_completo || '',
        responsavel_nome: (p.profiles as any)?.nome_completo || '',
      }))

      setProcessos(processosFormatados)
    } catch (err) {
      console.error('Erro ao carregar processos:', err)
      setErro('Erro ao carregar processos')
    } finally {
      setCarregandoProcessos(false)
    }
  }, [escritorioId, clientesSelecionados, supabase])

  // Gerar resumo IA para um processo
  const gerarResumoIA = useCallback(async (processoId: string) => {
    const processo = processos.find(p => p.id === processoId)
    if (!processo) return

    setResumosEmGeracao(prev => new Set(prev).add(processoId))

    try {
      // Buscar ultimas 5 movimentacoes do processo
      const { data: movs } = await supabase
        .from('processos_movimentacoes')
        .select('id, data_movimento, tipo_descricao, descricao')
        .eq('processo_id', processoId)
        .order('data_movimento', { ascending: false })
        .limit(5)

      // Chamar Edge Function para gerar resumo com IA
      const { data: result, error: fnError } = await supabase.functions.invoke('relatorios-resumo-ia', {
        body: {
          processo_id: processoId,
          numero_cnj: processo.numero_cnj || processo.numero_pasta,
          area: processo.area,
          fase: processo.fase,
          status: processo.status,
          cliente_nome: processo.cliente_nome,
          polo_cliente: processo.polo_cliente,
          objeto_acao: processo.objeto_acao,
          movimentacoes: movs || []
        }
      })

      if (fnError) {
        console.error('Erro da Edge Function:', fnError)
        return
      }

      if (result?.sucesso && result?.resumo) {
        setResumos(prev => ({ ...prev, [processoId]: result.resumo }))
      } else if (result?.erro) {
        // Se houver erro, deixar sem resumo para o usuario tentar novamente
        console.error('Erro da API:', result.erro)
      }
    } catch (err) {
      console.error('Erro ao gerar resumo:', err)
    } finally {
      setResumosEmGeracao(prev => {
        const next = new Set(prev)
        next.delete(processoId)
        return next
      })
    }
  }, [processos, supabase])

  // Gerar resumos para todos os processos
  const gerarTodosResumos = async () => {
    setGerandoResumos(true)

    // Gerar em paralelo (max 3 por vez para nao sobrecarregar)
    const batchSize = 3
    for (let i = 0; i < processos.length; i += batchSize) {
      const batch = processos.slice(i, i + batchSize)
      await Promise.all(
        batch.map(p => {
          if (!resumos[p.id]) {
            return gerarResumoIA(p.id)
          }
          return Promise.resolve()
        })
      )
    }

    setGerandoResumos(false)
  }

  // Atualizar processo via Escavador
  const atualizarEscavador = async (numeroCnj: string) => {
    try {
      const response = await fetch('/api/escavador/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cnj: numeroCnj })
      })

      if (response.ok) {
        // Recarregar processos apos atualizacao
        await carregarProcessos()
      }
    } catch (err) {
      console.error('Erro ao atualizar Escavador:', err)
    }
  }

  // Atualizar todos os processos via Escavador
  const atualizarTodosEscavador = async () => {
    setAtualizandoTodosEscavador(true)
    try {
      // Filtrar apenas processos com CNJ
      const processosComCnj = processos.filter(p => p.numero_cnj)

      // Atualizar em paralelo (max 3 por vez)
      const batchSize = 3
      for (let i = 0; i < processosComCnj.length; i += batchSize) {
        const batch = processosComCnj.slice(i, i + batchSize)
        await Promise.all(
          batch.map(p => atualizarEscavador(p.numero_cnj!))
        )
      }

      // Recarregar processos apos todas atualizacoes
      await carregarProcessos()
    } catch (err) {
      console.error('Erro ao atualizar todos via Escavador:', err)
    } finally {
      setAtualizandoTodosEscavador(false)
    }
  }

  // Salvar template
  const salvarTemplate = async () => {
    if (!escritorioId || !nomeNovoTemplate.trim()) return

    setSalvandoTemplate(true)
    try {
      const { data, error } = await supabase
        .from('relatorios_templates')
        .insert({
          escritorio_id: escritorioId,
          nome: nomeNovoTemplate.trim(),
          colunas: colunas,
          incluir_logo: incluirLogo,
          criado_por: userId
        })
        .select()
        .single()

      if (error) throw error

      setTemplates(prev => [...prev, data])
      setTemplateSelecionado(data.id)
      setNomeNovoTemplate('')
    } catch (err) {
      console.error('Erro ao salvar template:', err)
    } finally {
      setSalvandoTemplate(false)
    }
  }

  // Gerar Excel
  const gerarExcel = async () => {
    if (!escritorioId) return

    setGerandoExcel(true)
    setErro(null)

    try {
      const response = await fetch('/api/relatorios/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escritorio_id: escritorioId,
          template_id: templateSelecionado || null,
          colunas: colunas,
          clientes_ids: clientesSelecionados.map(c => c.id),
          incluir_logo: incluirLogo,
          salvar_andamentos: salvarAndamentos,
          resumos: resumos,
          processos_ids: processos.map(p => p.id)
        })
      })

      const result = await response.json()

      if (result.sucesso) {
        setArquivoUrl(result.arquivo_url)
        setArquivoNome(result.arquivo_nome)
        setRelatorioId(result.relatorio_id)
        setStep('download')
      } else {
        setErro(result.erro || 'Erro ao gerar relatorio')
      }
    } catch (err) {
      console.error('Erro ao gerar Excel:', err)
      setErro('Erro ao gerar relatorio')
    } finally {
      setGerandoExcel(false)
    }
  }

  // Navegacao do wizard
  const podeAvancar = () => {
    switch (step) {
      case 'colunas':
        return colunas.length > 0
      case 'clientes':
        return clientesSelecionados.length > 0
      case 'revisao':
        return processos.length > 0 && Object.keys(resumos).length === processos.length
      default:
        return false
    }
  }

  const avancar = async () => {
    if (step === 'colunas') {
      setStep('clientes')
    } else if (step === 'clientes') {
      await carregarProcessos()
      setStep('revisao')
      // Iniciar geracao de resumos automaticamente
      setTimeout(() => gerarTodosResumos(), 500)
    } else if (step === 'revisao') {
      await gerarExcel()
    }
  }

  const voltar = () => {
    if (step === 'clientes') setStep('colunas')
    else if (step === 'revisao') setStep('clientes')
    else if (step === 'download') setStep('revisao')
  }

  const stepIndex = STEPS.findIndex(s => s.key === step)

  if (!escritorioId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/processos')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">
              Gerar Relatorio de Processos
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Crie um relatorio em Excel para enviar aos seus clientes
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/processos/relatorios/historico')}
          className="h-10"
        >
          <Clock className="w-4 h-4 mr-2" />
          Historico
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                  stepIndex === i
                    ? "bg-[#34495e] text-white"
                    : stepIndex > i
                      ? "bg-[#89bcbe]/30 text-[#34495e]"
                      : "bg-slate-100 text-slate-500"
                )}
              >
                {stepIndex > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  s.icon
                )}
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    stepIndex > i ? "bg-[#89bcbe]" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 'colunas' && (
        <div className="space-y-6">
          {/* Template selector */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-medium text-slate-700">
                Modelo de Relatorio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500 mb-1.5 block">
                    Usar modelo salvo
                  </Label>
                  <Select value={templateSelecionado || 'none'} onValueChange={(v) => setTemplateSelecionado(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecionar modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (configurar manualmente)</SelectItem>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-slate-300">ou</div>
                <div className="flex-1">
                  <Label className="text-xs text-slate-500 mb-1.5 block">
                    Salvar configuracao atual como novo modelo
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do modelo..."
                      value={nomeNovoTemplate}
                      onChange={(e) => setNomeNovoTemplate(e.target.value)}
                      className="h-10"
                    />
                    <Button
                      variant="outline"
                      onClick={salvarTemplate}
                      disabled={!nomeNovoTemplate.trim() || salvandoTemplate}
                      className="h-10"
                    >
                      {salvandoTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column selector */}
          <ColumnSelector
            selectedColumns={colunas}
            onColumnsChange={setColunas}
          />

          {/* Opcoes adicionais */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="incluir-logo"
                  checked={incluirLogo}
                  onCheckedChange={(checked) => setIncluirLogo(checked === true)}
                />
                <Label htmlFor="incluir-logo" className="flex items-center gap-2 cursor-pointer">
                  <Image className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">Incluir logo do escritorio no cabecalho</span>
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'clientes' && (
        <ClientSelector
          escritorioId={escritorioId}
          selectedClients={clientesSelecionados}
          onClientsChange={setClientesSelecionados}
        />
      )}

      {step === 'revisao' && (
        <div className="space-y-4">
          {/* Card de atualizacao via Escavador */}
          <Card className="border-[#89bcbe] bg-[#f0f9f9] shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#89bcbe]/30 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-[#34495e]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#34495e]">
                      Atualizar Processos via Escavador
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Busque as movimentacoes mais recentes antes de gerar os resumos
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={atualizarTodosEscavador}
                  disabled={atualizandoTodosEscavador}
                  className="h-9 border-[#89bcbe] text-[#34495e] hover:bg-[#89bcbe]/20"
                >
                  {atualizandoTodosEscavador ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {atualizandoTodosEscavador ? 'Atualizando...' : 'Atualizar Todos'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Header da revisao */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#89bcbe]/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#34495e]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#34495e]">
                      Revisar Andamentos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {processos.length} processo{processos.length !== 1 ? 's' : ''} |{' '}
                      {Object.keys(resumos).length} resumo{Object.keys(resumos).length !== 1 ? 's' : ''} gerado{Object.keys(resumos).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={gerarTodosResumos}
                    disabled={gerandoResumos}
                    className="h-9"
                  >
                    {gerandoResumos ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {gerandoResumos ? 'Gerando...' : 'Gerar Todos com IA'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de processos */}
          {carregandoProcessos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe]" />
            </div>
          ) : (
            <div className="space-y-3">
              {processos.map(processo => (
                <ProcessoResumoCard
                  key={processo.id}
                  processo={processo}
                  resumo={resumos[processo.id] || ''}
                  onResumoChange={(id, texto) => setResumos(prev => ({ ...prev, [id]: texto }))}
                  onRegenerarResumo={gerarResumoIA}
                  onAtualizarEscavador={atualizarEscavador}
                  carregando={resumosEmGeracao.has(processo.id)}
                />
              ))}
            </div>
          )}

          {/* Opcao de salvar andamentos */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="salvar-andamentos"
                  checked={salvarAndamentos}
                  onCheckedChange={(checked) => setSalvarAndamentos(checked === true)}
                />
                <Label htmlFor="salvar-andamentos" className="flex items-center gap-2 cursor-pointer">
                  <FolderOpen className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">
                    Salvar andamentos gerados nas pastas dos processos
                  </span>
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'download' && (
        <div className="flex flex-col items-center justify-center py-12">
          {erro ? (
            <Card className="border-red-200 bg-red-50 max-w-md w-full">
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-700 mb-2">
                  Erro ao gerar relatorio
                </h3>
                <p className="text-sm text-red-600">{erro}</p>
                <Button
                  variant="outline"
                  onClick={() => setStep('revisao')}
                  className="mt-4"
                >
                  Voltar e tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-200 bg-emerald-50 max-w-md w-full">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-emerald-700 mb-2">
                  Relatorio gerado com sucesso!
                </h3>
                <p className="text-sm text-emerald-600 mb-6">
                  {arquivoNome}
                </p>
                {arquivoUrl && (
                  <Button
                    size="lg"
                    className="bg-[#34495e] hover:bg-[#46627f] text-white"
                    asChild
                  >
                    <a href={arquivoUrl} download={arquivoNome}>
                      <Download className="w-5 h-5 mr-2" />
                      Baixar Excel
                    </a>
                  </Button>
                )}
                <div className="mt-6 pt-6 border-t border-emerald-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset wizard
                      setStep('colunas')
                      setClientesSelecionados([])
                      setProcessos([])
                      setResumos({})
                      setArquivoUrl(null)
                      setArquivoNome(null)
                    }}
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  >
                    Gerar outro relatorio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Footer com navegacao */}
      {step !== 'download' && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={voltar}
            disabled={step === 'colunas'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={avancar}
            disabled={!podeAvancar() || gerandoExcel}
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            {gerandoExcel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : step === 'revisao' ? (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Gerar Relatorio
              </>
            ) : (
              <>
                Proximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
