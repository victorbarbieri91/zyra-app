'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ResultadoBusca {
  id: string
  modulo: 'processo' | 'consultivo'
  numero_pasta: string
  numero_cnj?: string
  titulo?: string
  partes?: string
  tipo?: string
}

/**
 * Busca inteligente unificada em processos e consultivo (pasta, CNJ, cliente, título).
 * Extraída do VinculacaoSelector para ser reaproveitada pelo modal V4 de Nova Tarefa
 * sem duplicar a query — o comportamento é idêntico ao componente original.
 */
export function useVinculacaoSearch() {
  const [buscaTexto, setBuscaTexto] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [loading, setLoading] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)

  const supabase = createClient()

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

  const limpar = () => {
    setBuscaTexto('')
    setResultados([])
    setMostrarResultados(false)
  }

  const resultadosProcessos = resultados.filter(r => r.modulo === 'processo')
  const resultadosConsultivos = resultados.filter(r => r.modulo === 'consultivo')

  return {
    buscaTexto,
    setBuscaTexto,
    resultados,
    resultadosProcessos,
    resultadosConsultivos,
    loading,
    mostrarResultados,
    setMostrarResultados,
    limpar,
  }
}
