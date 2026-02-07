'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { FileText, X, Search, Scale } from 'lucide-react'
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

function ResultItem({ resultado, onSelect }: { resultado: ResultadoBusca; onSelect: (r: ResultadoBusca) => void }) {
  const isProcesso = resultado.modulo === 'processo'

  return (
    <button
      type="button"
      onClick={() => onSelect(resultado)}
      className="w-full text-left px-3 py-2.5 hover:bg-[#89bcbe]/8 transition-colors border-b border-slate-100 last:border-0 group"
    >
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "mt-0.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
          isProcesso ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
        )}>
          {isProcesso
            ? <Scale className="w-3.5 h-3.5" />
            : <FileText className="w-3.5 h-3.5" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {isProcesso ? (
            <>
              {/* Processo: partes como destaque principal */}
              <div className="text-sm font-semibold text-[#34495e] truncate">
                {resultado.partes || `Pasta ${resultado.numero_pasta}`}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {resultado.partes && (
                  <span className="text-xs text-slate-500 font-medium">
                    Pasta {resultado.numero_pasta}
                  </span>
                )}
                {resultado.numero_cnj && (
                  <>
                    {resultado.partes && <span className="text-slate-300">&middot;</span>}
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      CNJ: {resultado.numero_cnj}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Consultivo: titulo como destaque principal */}
              <div className="text-sm font-semibold text-[#34495e] line-clamp-1">
                {resultado.titulo || `Pasta ${resultado.numero_pasta}`}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500 font-medium">
                  Pasta {resultado.numero_pasta}
                </span>
                {resultado.partes && (
                  <>
                    <span className="text-slate-300">&middot;</span>
                    <span className="text-xs text-slate-400 truncate">
                      {resultado.partes}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  )
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
            .limit(20)

          if (processos) {
            processos.forEach((p: any) => {
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
            .limit(20)

          if (processosPorCliente) {
            processosPorCliente.forEach((cliente: any) => {
              const clienteNome = cliente.nome_completo || cliente.nome_fantasia

              if (cliente.processos_processos && Array.isArray(cliente.processos_processos)) {
                cliente.processos_processos.forEach((proc: any) => {
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
              numero,
              titulo,
              crm_pessoas!consultivo_consultas_cliente_id_fkey(nome_completo, nome_fantasia)
            `)
            .or(`numero.ilike.%${buscaTexto}%,titulo.ilike.%${buscaTexto}%`)
            .limit(20)

          if (consultivos) {
            consultivos.forEach((c: any) => {
              const clienteNome = c.crm_pessoas?.nome_completo || c.crm_pessoas?.nome_fantasia

              resultadosUnificados.push({
                id: c.id,
                modulo: 'consultivo',
                numero_pasta: c.numero,
                titulo: c.titulo,
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
                numero,
                titulo
              )
            `)
            .or(`nome_completo.ilike.%${buscaTexto}%,nome_fantasia.ilike.%${buscaTexto}%`)
            .limit(20)

          if (consultivosPorCliente) {
            consultivosPorCliente.forEach((cliente: any) => {
              const clienteNome = cliente.nome_completo || cliente.nome_fantasia

              if (cliente.consultivo_consultas && Array.isArray(cliente.consultivo_consultas)) {
                cliente.consultivo_consultas.forEach((cons: any) => {
                  if (!resultadosUnificados.find(r => r.id === cons.id)) {
                    resultadosUnificados.push({
                      id: cons.id,
                      modulo: 'consultivo',
                      numero_pasta: cons.numero,
                      titulo: cons.titulo,
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

  // Agrupar resultados por módulo
  const resultadosProcessos = resultados.filter(r => r.modulo === 'processo')
  const resultadosConsultivos = resultados.filter(r => r.modulo === 'consultivo')

  return (
    <div className={cn('space-y-3', className)}>
      {/* Card de Vinculacao Ativa */}
      {vinculacao && (
        <div className="relative bg-white border border-slate-200 rounded-lg p-3 pr-8 hover:border-slate-300 transition-colors">
          {vinculacao.metadados?.partes && (
            <div className="text-sm font-semibold text-[#34495e] mb-1.5">
              {vinculacao.metadados.partes}
            </div>
          )}

          {vinculacao.metadados?.titulo && !vinculacao.metadados?.partes && (
            <div className="text-sm font-semibold text-[#34495e] mb-1.5 line-clamp-1">
              {vinculacao.metadados.titulo}
            </div>
          )}

          <div className="space-y-0.5 text-xs">
            <div className={cn(
              !vinculacao.metadados?.partes && !vinculacao.metadados?.titulo
                ? "font-semibold text-[#34495e] text-sm mb-1"
                : "font-medium text-slate-600"
            )}>
              Pasta {vinculacao.metadados?.numero_pasta || 'S/N'}
            </div>

            {vinculacao.metadados?.numero_cnj && (
              <div className="font-mono text-[10px] text-slate-500">
                CNJ: {vinculacao.metadados.numero_cnj}
              </div>
            )}

            {vinculacao.metadados?.titulo && vinculacao.metadados?.partes && (
              <div className="text-slate-500 line-clamp-1">
                {vinculacao.metadados.titulo}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRemoverVinculacao}
            className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            title="Remover vinculacao"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campo de Busca Inteligente */}
      {!vinculacao && (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              onFocus={() => buscaTexto.length >= 2 && resultados.length > 0 && setMostrarResultados(true)}
              placeholder="Buscar por pasta, CNJ, cliente ou titulo..."
              className="pl-10 text-sm border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]"
            />
          </div>

          {/* Lista de Resultados - Inline */}
          {mostrarResultados && (
            <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-sm max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-[#89bcbe] rounded-full animate-spin" />
                  <span>Buscando processos e consultivos...</span>
                </div>
              ) : resultados.length > 0 ? (
                <div>
                  {/* Contador de resultados */}
                  <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
                  </div>

                  {/* Grupo: Processos */}
                  {resultadosProcessos.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 border-b border-slate-100">
                        <Scale className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-semibold text-[#34495e]">Processos</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{resultadosProcessos.length}</span>
                      </div>
                      {resultadosProcessos.map((resultado) => (
                        <ResultItem key={resultado.id} resultado={resultado} onSelect={handleSelecionarResultado} />
                      ))}
                    </>
                  )}

                  {/* Grupo: Consultivos */}
                  {resultadosConsultivos.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 border-b border-slate-100">
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-[#34495e]">Consultivos</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{resultadosConsultivos.length}</span>
                      </div>
                      {resultadosConsultivos.map((resultado) => (
                        <ResultItem key={resultado.id} resultado={resultado} onSelect={handleSelecionarResultado} />
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Search className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Nenhum resultado encontrado</p>
                  <p className="text-[11px] text-slate-300 mt-1">Tente buscar por pasta, CNJ, cliente ou titulo</p>
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
