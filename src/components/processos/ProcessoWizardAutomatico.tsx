'use client'

import { useState, useEffect, useMemo } from 'react'
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
import {
  X,
  Check,
  Loader2,
  Scale,
  Building2,
  Users,
  Calendar,
  Banknote,
  Bell,
  BellOff,
  UserCircle,
  Briefcase,
  Plus,
  Search,
  MapPin,
  Gavel,
  ExternalLink,
  FileText,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ProcessoEscavadorNormalizado, ParteNormalizada } from '@/lib/escavador/types'
import { formatarDataExibicao, formatarValorCausa } from '@/lib/escavador/normalizer'

interface ProcessoWizardAutomaticoProps {
  open: boolean
  onClose: () => void
  dadosEscavador: ProcessoEscavadorNormalizado
  onProcessoCriado?: (processoId: string) => void
}

interface ClienteOption {
  id: string
  nome_completo: string
  tipo_pessoa: 'fisica' | 'juridica'
  cpf_cnpj?: string
}

interface ColaboradorOption {
  id: string
  nome_completo: string
  email: string
}

export default function ProcessoWizardAutomatico({
  open,
  onClose,
  dadosEscavador,
  onProcessoCriado
}: ProcessoWizardAutomaticoProps) {
  // Form state
  const [clienteId, setClienteId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [ativarMonitoramento, setAtivarMonitoramento] = useState(false)
  const [loading, setLoading] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')

  // Data loading states
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([])
  const [loadingColaboradores, setLoadingColaboradores] = useState(false)

  const supabase = createClient()

  // Extrair partes por polo
  const partesAtivas = useMemo(() =>
    dadosEscavador.partes.filter(p => p.polo === 'ativo'),
    [dadosEscavador.partes]
  )
  const partesPassivas = useMemo(() =>
    dadosEscavador.partes.filter(p => p.polo === 'passivo'),
    [dadosEscavador.partes]
  )

  // Sugestões de busca baseadas nas partes ou titulos
  const sugestoesBusca = useMemo(() => {
    const nomes: string[] = []

    // Primeiro tenta usar os titulos dos polos (mais confiáveis)
    if (dadosEscavador.titulo_polo_ativo) {
      const palavras = dadosEscavador.titulo_polo_ativo.split(' ')
      for (const palavra of palavras.slice(0, 2)) {
        if (palavra.length > 2 && !nomes.includes(palavra)) {
          nomes.push(palavra)
        }
      }
    }
    if (dadosEscavador.titulo_polo_passivo) {
      const palavras = dadosEscavador.titulo_polo_passivo.split(' ')
      for (const palavra of palavras.slice(0, 2)) {
        if (palavra.length > 2 && !nomes.includes(palavra)) {
          nomes.push(palavra)
        }
      }
    }

    // Se não tiver titulos, usa as partes
    if (nomes.length === 0) {
      for (const parte of [...partesAtivas, ...partesPassivas]) {
        const nome = parte.nome.split(' ')[0]
        if (nome.length > 2 && !nomes.includes(nome)) {
          nomes.push(nome)
        }
      }
    }

    return nomes.slice(0, 4)
  }, [dadosEscavador.titulo_polo_ativo, dadosEscavador.titulo_polo_passivo, partesAtivas, partesPassivas])

  // Carregar dados ao abrir
  useEffect(() => {
    if (open) {
      loadClientes('')
      loadColaboradores()
      // Auto-preencher busca com primeiro nome da parte ativa
      if (sugestoesBusca.length > 0 && !buscaCliente) {
        setBuscaCliente(sugestoesBusca[0])
      }
    }
  }, [open])

  // Recarregar clientes quando busca muda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (buscaCliente.length >= 2) {
        loadClientes(buscaCliente)
      } else if (buscaCliente.length === 0) {
        loadClientes('')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [buscaCliente])

  const loadClientes = async (query: string) => {
    setLoadingClientes(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.user.id)
        .single()

      if (!profile?.escritorio_id) return

      let queryBuilder = supabase
        .from('crm_pessoas')
        .select('id, nome_completo, tipo_pessoa, cpf_cnpj')
        .eq('escritorio_id', profile.escritorio_id)
        .eq('tipo_cadastro', 'cliente')
        .order('nome_completo')
        .limit(20)

      if (query && query.length >= 2) {
        queryBuilder = queryBuilder.ilike('nome_completo', `%${query}%`)
      }

      const { data, error } = await queryBuilder

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error instanceof Error ? error.message : error)
    } finally {
      setLoadingClientes(false)
    }
  }

  const loadColaboradores = async () => {
    setLoadingColaboradores(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.user.id)
        .single()

      if (!profile?.escritorio_id) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .eq('escritorio_id', profile.escritorio_id)
        .order('nome_completo')

      if (error) throw error
      setColaboradores(data || [])

      // Auto-selecionar usuário atual como responsável
      if (data && data.length > 0 && !responsavelId) {
        const currentUser = data.find(c => c.id === user.user?.id)
        if (currentUser) {
          setResponsavelId(currentUser.id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error instanceof Error ? error.message : error)
    } finally {
      setLoadingColaboradores(false)
    }
  }

  const handleClose = () => {
    setClienteId('')
    setResponsavelId('')
    setAtivarMonitoramento(false)
    setBuscaCliente('')
    onClose()
  }

  const handleSubmit = async () => {
    // Validações
    if (!clienteId) {
      toast.error('Selecione um cliente para vincular ao processo')
      return
    }
    if (!responsavelId) {
      toast.error('Selecione o advogado responsável')
      return
    }

    setLoading(true)

    try {
      // Obter escritorio_id do usuário
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        toast.error('Usuário não autenticado')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.user.id)
        .single()

      if (!profile?.escritorio_id) {
        toast.error('Escritório não encontrado')
        return
      }

      // Extrair parte contraria do polo oposto
      const parteContraria = partesPassivas[0]?.nome ||
                             dadosEscavador.titulo_polo_passivo ||
                             partesAtivas[0]?.nome ||
                             dadosEscavador.titulo_polo_ativo || ''

      // Determinar área jurídica (mapear se necessário)
      const areaJuridica = mapearArea(dadosEscavador.area || dadosEscavador.classe || 'Cível')

      // Montar dados do processo para inserção
      const processData = {
        escritorio_id: profile.escritorio_id,
        numero_cnj: dadosEscavador.numero_cnj,
        outros_numeros: [],
        tipo: dadosEscavador.tipo || 'judicial',
        area: areaJuridica,
        objeto_acao: dadosEscavador.assunto || dadosEscavador.assunto_principal || dadosEscavador.classe || '',
        tribunal: dadosEscavador.tribunal,
        instancia: mapearInstancia(dadosEscavador.instancia),
        comarca: dadosEscavador.comarca || dadosEscavador.cidade || '',
        vara: dadosEscavador.vara || dadosEscavador.orgao_julgador || '',
        uf: dadosEscavador.estado || '',
        valor_causa: dadosEscavador.valor_causa || null,
        data_distribuicao: dadosEscavador.data_distribuicao || new Date().toISOString().split('T')[0],
        cliente_id: clienteId,
        responsavel_id: responsavelId,
        fase: 'conhecimento',
        status: 'ativo',
        parte_contraria: parteContraria,
        polo_cliente: partesAtivas.length > 0 ? 'ativo' : 'passivo',
        created_by: user.user.id,
      }

      // Inserir processo no banco
      const { data: novoProcesso, error } = await supabase
        .from('processos_processos')
        .insert(processData)
        .select('id')
        .single()

      if (error) {
        console.error('Erro ao criar processo:', error)
        if (error.code === '23505') {
          toast.error('Já existe um processo com este número CNJ')
        } else {
          toast.error(`Erro ao criar processo: ${error.message}`)
        }
        return
      }

      // Se ativar monitoramento, chamar API
      if (ativarMonitoramento && novoProcesso) {
        try {
          const monitorResponse = await fetch('/api/escavador/monitoramento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_cnj: dadosEscavador.numero_cnj,
              tribunal: dadosEscavador.tribunal,
              processo_id: novoProcesso.id
            })
          })

          const monitorResult = await monitorResponse.json()
          if (monitorResult.sucesso) {
            toast.success('Monitoramento ativado!')
          }
        } catch {
          // Silently fail monitoring - process was created
        }
      }

      toast.success('Processo criado com sucesso!')
      handleClose()
      onProcessoCriado?.(novoProcesso.id)
    } catch (error) {
      console.error('Erro ao criar processo:', error)
      toast.error('Erro ao criar processo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Mapear área jurídica
  const mapearArea = (area: string): string => {
    const areaLower = area.toLowerCase()
    if (areaLower.includes('trabalhist') || areaLower.includes('trabalho')) return 'Trabalhista'
    if (areaLower.includes('família') || areaLower.includes('familia')) return 'Família'
    if (areaLower.includes('criminal') || areaLower.includes('penal')) return 'Criminal'
    if (areaLower.includes('tributár') || areaLower.includes('tributar') || areaLower.includes('fiscal')) return 'Tributária'
    if (areaLower.includes('consumidor') || areaLower.includes('cdc')) return 'Consumidor'
    if (areaLower.includes('empresar') || areaLower.includes('falência')) return 'Empresarial'
    return 'Cível'
  }

  // Mapear instância
  const mapearInstancia = (instancia: string | number | undefined): string => {
    if (!instancia) return '1ª'
    const inst = String(instancia)
    if (inst === '1' || inst.includes('1')) return '1ª'
    if (inst === '2' || inst.includes('2')) return '2ª'
    if (inst.toLowerCase().includes('stj')) return 'STJ'
    if (inst.toLowerCase().includes('stf')) return 'STF'
    if (inst.toLowerCase().includes('tst')) return 'TST'
    return '1ª'
  }

  // Componente para exibir uma parte
  const ParteItem = ({ parte }: { parte: ParteNormalizada }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            {parte.tipo_participacao}
          </span>
          {parte.tipo_pessoa !== 'desconhecido' && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-slate-500">
              {parte.tipo_pessoa === 'fisica' ? 'PF' : 'PJ'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-700">{parte.nome}</p>
        {parte.advogados && parte.advogados.length > 0 && (
          <p className="text-[11px] text-slate-500 mt-0.5">
            Adv: {parte.advogados.map(a => a.nome).join(', ')}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Cadastrar Processo</DialogTitle>

        {/* Header compacto */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-9 h-9 rounded-lg bg-[#34495e]/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-[#34495e]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#34495e]">Cadastrar Processo</h2>
            <p className="text-xs text-slate-500 font-mono">{dadosEscavador.numero_cnj}</p>
          </div>
        </div>

        {/* Content - 2 colunas lado a lado */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 divide-x divide-slate-200 min-h-0">

            {/* Coluna Esquerda - Ficha do Processo (3/5) */}
            <div className="col-span-3 p-5 space-y-4 overflow-y-auto">

              {/* Dados Principais */}
              <div className="space-y-3">
                {/* Classe e Tipo */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Classe</p>
                    <p className="text-sm font-semibold text-[#34495e] mt-0.5">
                      {dadosEscavador.classe || dadosEscavador.area || '-'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {dadosEscavador.tipo}
                  </Badge>
                </div>

                {/* Assunto */}
                {dadosEscavador.assunto && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Assunto</p>
                    <p className="text-sm text-slate-600 mt-0.5">{dadosEscavador.assunto}</p>
                  </div>
                )}

                {/* Grid de infos */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {/* Tribunal */}
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Tribunal</p>
                      <p className="text-sm text-slate-700 font-medium">{dadosEscavador.tribunal}</p>
                      {dadosEscavador.tribunal_nome && dadosEscavador.tribunal_nome !== dadosEscavador.tribunal && (
                        <p className="text-[11px] text-slate-500">{dadosEscavador.tribunal_nome}</p>
                      )}
                    </div>
                  </div>

                  {/* Vara */}
                  <div className="flex items-start gap-2">
                    <Gavel className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Vara</p>
                      <p className="text-sm text-slate-700">{dadosEscavador.vara || dadosEscavador.orgao_julgador || '-'}</p>
                    </div>
                  </div>

                  {/* Comarca */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Comarca</p>
                      <p className="text-sm text-slate-700">
                        {dadosEscavador.comarca || dadosEscavador.cidade || '-'}
                        {dadosEscavador.estado && ` - ${dadosEscavador.estado}`}
                      </p>
                    </div>
                  </div>

                  {/* Distribuição */}
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Distribuição</p>
                      <p className="text-sm text-slate-700">{formatarDataExibicao(dadosEscavador.data_distribuicao)}</p>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="flex items-start gap-2">
                    <Banknote className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Valor da Causa</p>
                      <p className="text-sm text-slate-700 font-medium">
                        {dadosEscavador.valor_causa_formatado || formatarValorCausa(dadosEscavador.valor_causa)}
                      </p>
                    </div>
                  </div>

                  {/* Instância */}
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Instância</p>
                      <p className="text-sm text-slate-700">{dadosEscavador.instancia} Instância</p>
                    </div>
                  </div>

                  {/* Juiz */}
                  {dadosEscavador.juiz && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Juiz</p>
                        <p className="text-sm text-slate-700">{dadosEscavador.juiz}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Divisor */}
              <div className="border-t border-slate-200" />

              {/* Partes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Partes do Processo
                  </p>
                </div>

                {/* Usar titulos se não tiver partes detalhadas */}
                {partesAtivas.length === 0 && partesPassivas.length === 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {dadosEscavador.titulo_polo_ativo && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Polo Ativo
                        </p>
                        <p className="text-sm text-slate-700">{dadosEscavador.titulo_polo_ativo}</p>
                      </div>
                    )}
                    {dadosEscavador.titulo_polo_passivo && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Polo Passivo
                        </p>
                        <p className="text-sm text-slate-700">{dadosEscavador.titulo_polo_passivo}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Polo Ativo */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                        Polo Ativo
                      </p>
                      {partesAtivas.length > 0 ? (
                        <div>
                          {partesAtivas.map((parte, i) => (
                            <ParteItem key={`ativo-${i}`} parte={parte} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {dadosEscavador.titulo_polo_ativo || 'Não identificado'}
                        </p>
                      )}
                    </div>

                    {/* Polo Passivo */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                        Polo Passivo
                      </p>
                      {partesPassivas.length > 0 ? (
                        <div>
                          {partesPassivas.map((parte, i) => (
                            <ParteItem key={`passivo-${i}`} parte={parte} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {dadosEscavador.titulo_polo_passivo || 'Não identificado'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita - Configurações (2/5) */}
            <div className="col-span-2 p-5 bg-slate-50/50 space-y-5 overflow-y-auto">

              {/* Vincular Cliente */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#34495e]">
                  Vincular Cliente *
                </Label>

                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="pl-9 bg-white"
                  />
                </div>

                {/* Sugestões */}
                {sugestoesBusca.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Sugestões:</span>
                    {sugestoesBusca.map((sugestao, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setBuscaCliente(sugestao)}
                        className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                      >
                        {sugestao}
                      </button>
                    ))}
                  </div>
                )}

                {/* Select */}
                <Select
                  value={clienteId}
                  onValueChange={setClienteId}
                  disabled={loadingClientes}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={
                      loadingClientes ? 'Buscando...' :
                      clientes.length === 0 ? 'Nenhum encontrado' :
                      'Selecione'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{cliente.nome_completo}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
                            {cliente.tipo_pessoa === 'fisica' ? 'PF' : 'PJ'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Link criar cliente */}
                <a
                  href="/dashboard/crm/pessoas?novo=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#1E3A8A] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar novo cliente
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Responsável */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#34495e]">
                  Advogado Responsável *
                </Label>
                <Select
                  value={responsavelId}
                  onValueChange={setResponsavelId}
                  disabled={loadingColaboradores}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={loadingColaboradores ? 'Carregando...' : 'Selecione'} />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map(colab => (
                      <SelectItem key={colab.id} value={colab.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span>{colab.nome_completo}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Monitoramento */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      ativarMonitoramento ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                      {ativarMonitoramento ? (
                        <Bell className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <BellOff className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Monitoramento</p>
                      <p className="text-[11px] text-slate-500">Alertas automáticos</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAtivarMonitoramento(!ativarMonitoramento)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      ativarMonitoramento ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      ativarMonitoramento ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            size="sm"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !clienteId || !responsavelId}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Criar Processo
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
