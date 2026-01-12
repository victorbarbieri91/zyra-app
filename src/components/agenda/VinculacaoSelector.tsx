'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, FileText, X, Search, Scale, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Vinculacao {
  modulo: 'processo' | 'consultivo'
  modulo_registro_id: string
  metadados?: {
    numero_pasta?: string
    numero_cnj?: string
    titulo?: string
    partes?: string
    tipo?: string
  }
}

interface VinculacaoSelectorProps {
  vinculacao: Vinculacao | null
  onChange: (vinculacao: Vinculacao | null) => void
  className?: string
}

interface ResultadoBusca {
  id: string
  modulo: 'processo' | 'consultivo'
  numero_pasta: string
  numero_cnj?: string
  titulo?: string
  partes?: string
  tipo?: string
}

export default function VinculacaoSelector({
  vinculacao,
  onChange,
  className,
}: VinculacaoSelectorProps) {
  const [buscaTexto, setBuscaTexto] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [loading, setLoading] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)

  const supabase = createClient()

  // Busca inteligente unificada em processos e consultivo
  useEffect(() => {
    if (!buscaTexto || buscaTexto.length < 2) {
      setResultados([])
      setMostrarResultados(false)
      return
    }

    const buscarInteligente = async () => {
      try {
        setLoading(true)
        setMostrarResultados(true)
        const resultadosUnificados: ResultadoBusca[] = []

        // Buscar em processos_processos com cliente e parte contrária
        try {
          const { data: processos } = await supabase
            .from('processos_processos')
            .select(`
              id,
              numero_pasta,
              numero_cnj,
              parte_contraria,
              crm_pessoas!processos_processos_cliente_id_fkey(nome_completo, nome_fantasia)
            `)
            .or(`numero_pasta.ilike.%${buscaTexto}%,numero_cnj.ilike.%${buscaTexto}%,parte_contraria.ilike.%${buscaTexto}%`)
            .limit(10)

          if (processos) {
            processos.forEach((p: any) => {
              // Montar string de partes: Cliente vs Parte Contrária
              const clienteNome = p.crm_pessoas?.nome_completo || p.crm_pessoas?.nome_fantasia
              const parteContraria = p.parte_contraria

              let partes = ''
              if (clienteNome && parteContraria) {
                partes = `${clienteNome} × ${parteContraria}`
              } else if (clienteNome) {
                partes = clienteNome
              } else if (parteContraria) {
                partes = parteContraria
              }

              resultadosUnificados.push({
                id: p.id,
                modulo: 'processo',
                numero_pasta: p.numero_pasta,
                numero_cnj: p.numero_cnj,
                partes: partes || undefined,
              })
            })
          }

          // Buscar também processos onde o nome do cliente contém o texto de busca
          const { data: processosPorCliente } = await supabase
            .from('crm_pessoas')
            .select(`
              nome_completo,
              nome_fantasia,
              processos_processos!processos_processos_cliente_id_fkey(
                id,
                numero_pasta,
                numero_cnj,
                parte_contraria
              )
            `)
            .or(`nome_completo.ilike.%${buscaTexto}%,nome_fantasia.ilike.%${buscaTexto}%`)
            .limit(10)

          if (processosPorCliente) {
            processosPorCliente.forEach((cliente: any) => {
              const clienteNome = cliente.nome_completo || cliente.nome_fantasia

              // Para cada processo deste cliente
              if (cliente.processos_processos && Array.isArray(cliente.processos_processos)) {
                cliente.processos_processos.forEach((proc: any) => {
                  // Evitar duplicatas
                  if (!resultadosUnificados.find(r => r.id === proc.id)) {
                    const parteContraria = proc.parte_contraria
                    let partes = ''
                    if (clienteNome && parteContraria) {
                      partes = `${clienteNome} × ${parteContraria}`
                    } else if (clienteNome) {
                      partes = clienteNome
                    }

                    resultadosUnificados.push({
                      id: proc.id,
                      modulo: 'processo',
                      numero_pasta: proc.numero_pasta,
                      numero_cnj: proc.numero_cnj,
                      partes: partes || undefined,
                    })
                  }
                })
              }
            })
          }
        } catch (err) {
          console.warn('Erro ao buscar processos:', err)
        }

        // Buscar em consultivo_consultas com cliente
        try {
          const { data: consultivos } = await supabase
            .from('consultivo_consultas')
            .select(`
              id,
              numero_interno,
              assunto,
              crm_pessoas!consultivo_consultas_cliente_id_fkey(nome_completo, nome_fantasia)
            `)
            .or(`numero_interno.ilike.%${buscaTexto}%,assunto.ilike.%${buscaTexto}%`)
            .limit(10)

          if (consultivos) {
            consultivos.forEach((c: any) => {
              const clienteNome = c.crm_pessoas?.nome_completo || c.crm_pessoas?.nome_fantasia

              resultadosUnificados.push({
                id: c.id,
                modulo: 'consultivo',
                numero_pasta: c.numero_interno,
                titulo: c.assunto,
                partes: clienteNome || undefined,
              })
            })
          }

          // Buscar também consultivos por nome do cliente
          const { data: consultivosPorCliente } = await supabase
            .from('crm_pessoas')
            .select(`
              nome_completo,
              nome_fantasia,
              consultivo_consultas!consultivo_consultas_cliente_id_fkey(
                id,
                numero_interno,
                assunto
              )
            `)
            .or(`nome_completo.ilike.%${buscaTexto}%,nome_fantasia.ilike.%${buscaTexto}%`)
            .limit(10)

          if (consultivosPorCliente) {
            consultivosPorCliente.forEach((cliente: any) => {
              const clienteNome = cliente.nome_completo || cliente.nome_fantasia

              if (cliente.consultivo_consultas && Array.isArray(cliente.consultivo_consultas)) {
                cliente.consultivo_consultas.forEach((cons: any) => {
                  // Evitar duplicatas
                  if (!resultadosUnificados.find(r => r.id === cons.id)) {
                    resultadosUnificados.push({
                      id: cons.id,
                      modulo: 'consultivo',
                      numero_pasta: cons.numero_interno,
                      titulo: cons.assunto,
                      partes: clienteNome || undefined,
                    })
                  }
                })
              }
            })
          }
        } catch (err) {
          console.warn('Erro ao buscar consultivos:', err)
        }

        setResultados(resultadosUnificados)
      } catch (err) {
        console.error('Erro na busca inteligente:', err)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(buscarInteligente, 300)
    return () => clearTimeout(debounce)
  }, [buscaTexto])

  const handleSelecionarResultado = (resultado: ResultadoBusca) => {
    const novaVinculacao: Vinculacao = {
      modulo: resultado.modulo,
      modulo_registro_id: resultado.id,
      metadados: {
        numero_pasta: resultado.numero_pasta,
        numero_cnj: resultado.numero_cnj,
        titulo: resultado.titulo,
        partes: resultado.partes,
        tipo: resultado.tipo,
      },
    }

    onChange(novaVinculacao)
    setBuscaTexto('')
    setMostrarResultados(false)
    setResultados([])
  }

  const handleRemoverVinculacao = () => {
    onChange(null)
    setBuscaTexto('')
    setResultados([])
    setMostrarResultados(false)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Card de Vinculação Ativa - Minimalista */}
      {vinculacao && (
        <div className="relative bg-white border border-slate-200 rounded-lg p-3 pr-8 hover:border-slate-300 transition-colors">
          {/* Partes - Destaque Principal (se existir) */}
          {vinculacao.metadados?.partes && (
            <div className="text-sm font-semibold text-[#34495e] mb-1.5">
              {vinculacao.metadados.partes}
            </div>
          )}

          {/* Título - Destaque Principal (consultivo sem partes) */}
          {vinculacao.metadados?.titulo && !vinculacao.metadados?.partes && (
            <div className="text-sm font-semibold text-[#34495e] mb-1.5 line-clamp-1">
              {vinculacao.metadados.titulo}
            </div>
          )}

          {/* Informações */}
          <div className="space-y-0.5 text-xs">
            {/* Pasta - destaque se não tiver partes nem título */}
            <div className={cn(
              !vinculacao.metadados?.partes && !vinculacao.metadados?.titulo
                ? "font-semibold text-[#34495e] text-sm mb-1"
                : "font-medium text-slate-600"
            )}>
              Pasta {vinculacao.metadados?.numero_pasta || 'S/N'}
            </div>

            {/* CNJ */}
            {vinculacao.metadados?.numero_cnj && (
              <div className="font-mono text-[10px] text-slate-500">
                CNJ: {vinculacao.metadados.numero_cnj}
              </div>
            )}

            {/* Título (se consultivo com partes) */}
            {vinculacao.metadados?.titulo && vinculacao.metadados?.partes && (
              <div className="text-slate-500 line-clamp-1">
                {vinculacao.metadados.titulo}
              </div>
            )}
          </div>

          {/* Botão Remover - Discreto */}
          <button
            type="button"
            onClick={handleRemoverVinculacao}
            className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            title="Remover vinculação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campo de Busca Inteligente */}
      {!vinculacao && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              onFocus={() => buscaTexto && setMostrarResultados(true)}
              placeholder="Buscar por pasta, processo ou título..."
              className="pl-10 text-sm border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]"
            />
          </div>

          {/* Lista de Resultados */}
          {mostrarResultados && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {loading ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  Buscando...
                </div>
              ) : resultados.length > 0 ? (
                <div className="py-1">
                  {resultados.map((resultado) => (
                    <button
                      key={resultado.id}
                      type="button"
                      onClick={() => handleSelecionarResultado(resultado)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <div className="space-y-1">
                        {/* Partes - Destaque Principal (se existir) */}
                        {resultado.partes && (
                          <div className="text-sm font-semibold text-[#34495e]">
                            {resultado.partes}
                          </div>
                        )}

                        {/* Título (consultivo) - Destaque se não tiver partes */}
                        {resultado.titulo && !resultado.partes && (
                          <div className="text-sm font-semibold text-[#34495e] line-clamp-1">
                            {resultado.titulo}
                          </div>
                        )}

                        {/* Informações */}
                        <div className="space-y-0.5">
                          {/* Pasta - destaque se não tiver partes nem título */}
                          <div className={cn(
                            "text-xs",
                            !resultado.partes && !resultado.titulo
                              ? "font-semibold text-[#34495e] text-sm"
                              : "font-medium text-slate-600"
                          )}>
                            Pasta {resultado.numero_pasta}
                          </div>

                          {/* Número CNJ */}
                          {resultado.numero_cnj && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              CNJ: {resultado.numero_cnj}
                            </div>
                          )}

                          {/* Título (se consultivo COM partes) */}
                          {resultado.titulo && resultado.partes && (
                            <div className="text-[10px] text-slate-500 line-clamp-1">
                              {resultado.titulo}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-slate-400">
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!vinculacao && !buscaTexto && (
        <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
          Digite para buscar uma pasta, processo ou consultivo
        </div>
      )}
    </div>
  )
}
