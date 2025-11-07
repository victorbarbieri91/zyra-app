'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, User, FileText, DollarSign, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Vinculacao {
  modulo: 'processo' | 'consultivo' | 'crm' | 'financeiro'
  modulo_registro_id: string
  metadados?: {
    label?: string
    numero?: string
    nome?: string
  }
}

interface VinculacaoSelectorProps {
  vinculacoes: Vinculacao[]
  onChange: (vinculacoes: Vinculacao[]) => void
  className?: string
}

interface RegistroOption {
  id: string
  label: string
  sublabel?: string
}

const MODULOS_CONFIG = {
  processo: {
    label: 'Processo',
    icon: Briefcase,
    color: 'blue',
    table: 'processos',
    labelField: 'numero_cnj',
    sublabelField: 'numero_interno',
  },
  crm: {
    label: 'Cliente (CRM)',
    icon: User,
    color: 'emerald',
    table: 'crm_clientes',
    labelField: 'nome_completo',
    sublabelField: 'cpf_cnpj',
  },
  consultivo: {
    label: 'Consultivo',
    icon: FileText,
    color: 'amber',
    table: 'consultas', // Tabela ainda não existe
    labelField: 'titulo',
    sublabelField: null,
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    color: 'teal',
    table: 'financeiro_honorarios',
    labelField: 'numero_interno',
    sublabelField: 'descricao',
  },
}

export default function VinculacaoSelector({
  vinculacoes,
  onChange,
  className,
}: VinculacaoSelectorProps) {
  const [moduloSelecionado, setModuloSelecionado] = useState<keyof typeof MODULOS_CONFIG | ''>('')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [opcoes, setOpcoes] = useState<RegistroOption[]>([])
  const [loading, setLoading] = useState(false)
  const [registroSelecionado, setRegistroSelecionado] = useState<string>('')

  const supabase = createClient()

  // Buscar registros do módulo selecionado
  useEffect(() => {
    if (!moduloSelecionado) {
      setOpcoes([])
      return
    }

    const buscarRegistros = async () => {
      try {
        setLoading(true)

        const config = MODULOS_CONFIG[moduloSelecionado]

        // Verificar se a tabela existe antes de buscar
        const { data, error } = await supabase
          .from(config.table)
          .select('id, *')
          .limit(20)

        if (error) {
          console.warn(`Tabela ${config.table} ainda não existe:`, error)
          setOpcoes([])
          return
        }

        const opcoesFormatadas: RegistroOption[] = (data || []).map((registro: any) => ({
          id: registro.id,
          label: registro[config.labelField] || 'Sem título',
          sublabel: config.sublabelField ? registro[config.sublabelField] : undefined,
        }))

        setOpcoes(opcoesFormatadas)
      } catch (err) {
        console.error('Erro ao buscar registros:', err)
        setOpcoes([])
      } finally {
        setLoading(false)
      }
    }

    buscarRegistros()
  }, [moduloSelecionado])

  // Buscar com filtro de texto
  useEffect(() => {
    if (!moduloSelecionado || !buscaTexto) return

    const buscarComFiltro = async () => {
      try {
        setLoading(true)

        const config = MODULOS_CONFIG[moduloSelecionado]

        const { data, error } = await supabase
          .from(config.table)
          .select('id, *')
          .ilike(config.labelField, `%${buscaTexto}%`)
          .limit(20)

        if (error) {
          console.warn(`Erro ao buscar em ${config.table}:`, error)
          return
        }

        const opcoesFormatadas: RegistroOption[] = (data || []).map((registro: any) => ({
          id: registro.id,
          label: registro[config.labelField] || 'Sem título',
          sublabel: config.sublabelField ? registro[config.sublabelField] : undefined,
        }))

        setOpcoes(opcoesFormatadas)
      } catch (err) {
        console.error('Erro ao buscar com filtro:', err)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(buscarComFiltro, 300)
    return () => clearTimeout(debounce)
  }, [buscaTexto, moduloSelecionado])

  const handleAdicionarVinculacao = () => {
    if (!moduloSelecionado || !registroSelecionado) return

    const opcaoSelecionada = opcoes.find(o => o.id === registroSelecionado)
    if (!opcaoSelecionada) return

    // Verificar se já existe
    const jaExiste = vinculacoes.some(
      v => v.modulo === moduloSelecionado && v.modulo_registro_id === registroSelecionado
    )

    if (jaExiste) {
      alert('Esta vinculação já existe!')
      return
    }

    const novaVinculacao: Vinculacao = {
      modulo: moduloSelecionado,
      modulo_registro_id: registroSelecionado,
      metadados: {
        label: opcaoSelecionada.label,
        numero: opcaoSelecionada.sublabel,
      },
    }

    onChange([...vinculacoes, novaVinculacao])

    // Reset
    setModuloSelecionado('')
    setBuscaTexto('')
    setRegistroSelecionado('')
    setOpcoes([])
  }

  const handleRemoverVinculacao = (index: number) => {
    const novasVinculacoes = vinculacoes.filter((_, i) => i !== index)
    onChange(novasVinculacoes)
  }

  const getModuloConfig = (modulo: Vinculacao['modulo']) => MODULOS_CONFIG[modulo]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Lista de Vinculações Ativas */}
      {vinculacoes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#46627f]">Vinculações Ativas</Label>
          <div className="space-y-2">
            {vinculacoes.map((vinculacao, index) => {
              const config = getModuloConfig(vinculacao.modulo)
              const Icon = config.icon

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    config.color === 'blue' && 'bg-blue-100',
                    config.color === 'emerald' && 'bg-emerald-100',
                    config.color === 'amber' && 'bg-amber-100',
                    config.color === 'teal' && 'bg-teal-100'
                  )}>
                    <Icon className={cn(
                      'w-4 h-4',
                      config.color === 'blue' && 'text-blue-600',
                      config.color === 'emerald' && 'text-emerald-600',
                      config.color === 'amber' && 'text-amber-600',
                      config.color === 'teal' && 'text-teal-600'
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-sm font-medium text-[#34495e] truncate">
                        {vinculacao.metadados?.label}
                      </span>
                    </div>
                    {vinculacao.metadados?.numero && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {vinculacao.metadados.numero}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoverVinculacao(index)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Adicionar Nova Vinculação */}
      <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-white">
        <Label className="text-sm font-medium text-[#46627f]">Adicionar Vinculação</Label>

        {/* Seletor de Módulo */}
        <Select
          value={moduloSelecionado}
          onValueChange={(value: any) => {
            setModuloSelecionado(value)
            setBuscaTexto('')
            setRegistroSelecionado('')
          }}
        >
          <SelectTrigger className="border-slate-200">
            <SelectValue placeholder="Selecione o módulo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {Object.entries(MODULOS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <config.icon className="w-4 h-4" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Campo de Busca e Seleção */}
        {moduloSelecionado && (
          <>
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                placeholder={`Buscar ${MODULOS_CONFIG[moduloSelecionado].label.toLowerCase()}...`}
                className="pl-10 border-slate-200"
              />
            </div>

            {/* Lista de Opções */}
            {loading ? (
              <div className="text-sm text-slate-400 text-center py-4">
                Carregando...
              </div>
            ) : opcoes.length > 0 ? (
              <Select
                value={registroSelecionado}
                onValueChange={setRegistroSelecionado}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Selecione o registro..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoes.map((opcao) => (
                    <SelectItem key={opcao.id} value={opcao.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{opcao.label}</span>
                        {opcao.sublabel && (
                          <span className="text-xs text-slate-500">{opcao.sublabel}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                {buscaTexto ? 'Nenhum resultado encontrado' : 'Digite para buscar'}
              </div>
            )}

            {/* Botão Adicionar */}
            <Button
              type="button"
              onClick={handleAdicionarVinculacao}
              disabled={!registroSelecionado}
              className="w-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#5a9a9c] text-white"
            >
              Adicionar Vinculação
            </Button>
          </>
        )}
      </div>

      {/* Empty State */}
      {vinculacoes.length === 0 && !moduloSelecionado && (
        <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          Nenhuma vinculação. Selecione um módulo acima para adicionar.
        </div>
      )}
    </div>
  )
}
