import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface EscritorioImpressao {
  id: string
  nome: string
  cnpj: string | null
  logo_url: string | null
  endereco: {
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
    cep?: string
  } | null
  telefone: string | null
  email: string | null
}

export interface ClienteImpressao {
  id: string
  nome_completo: string
  nome_fantasia: string | null
  tipo_pessoa: 'pf' | 'pj'
  cpf_cnpj: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  email_principal: string | null
  telefone_principal: string | null
}

export interface FaturaImpressao {
  id: string
  numero_fatura: string
  data_emissao: string
  data_vencimento: string
  valor_total: number
  status: string
  observacoes: string | null
  total_honorarios: number
  total_horas: number
  soma_horas: number
}

export interface ItemFaturaImpressao {
  id: string
  tipo_item: 'honorario' | 'timesheet' | 'despesa'
  descricao: string
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number
  processo_id: string | null
  processo_numero: string | null
  processo_pasta: string | null
  partes_resumo: string | null
}

export interface FaturaImpressaoData {
  escritorio: EscritorioImpressao
  fatura: FaturaImpressao
  cliente: ClienteImpressao
  itens: ItemFaturaImpressao[]
  totais: {
    subtotal_honorarios: number
    subtotal_horas: number
    subtotal_despesas: number
    soma_horas: number
    valor_total: number
  }
}

export function useFaturaImpressao() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFaturaCompleta = useCallback(
    async (faturaId: string): Promise<FaturaImpressaoData | null> => {
      try {
        setLoading(true)
        setError(null)

        // 1. Buscar fatura
        const { data: faturaData, error: faturaError } = await supabase
          .from('financeiro_faturamento_faturas')
          .select('*')
          .eq('id', faturaId)
          .single()

        if (faturaError) throw new Error('Fatura não encontrada')

        // 2. Buscar escritório
        const { data: escritorioData, error: escritorioError } = await supabase
          .from('escritorios')
          .select('id, nome, cnpj, logo_url, endereco, config')
          .eq('id', faturaData.escritorio_id)
          .single()

        if (escritorioError) throw new Error('Escritório não encontrado')

        // 3. Buscar cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('crm_pessoas')
          .select(`
            id, nome_completo, nome_fantasia, tipo_pessoa, cpf_cnpj,
            logradouro, numero, complemento, bairro, cidade, uf, cep,
            email_principal, telefone_principal
          `)
          .eq('id', faturaData.cliente_id)
          .single()

        if (clienteError) throw new Error('Cliente não encontrado')

        // 4. Buscar itens com dados do processo
        const { data: itensData, error: itensError } = await supabase
          .from('financeiro_faturamento_itens')
          .select(`
            *,
            processo:processos_processos (
              numero_cnj,
              numero_pasta,
              autor,
              reu
            )
          `)
          .eq('fatura_id', faturaId)
          .order('tipo_item', { ascending: true })
          .order('created_at', { ascending: true })

        if (itensError) throw itensError

        // Mapear itens com dados do processo
        const itens: ItemFaturaImpressao[] = (itensData || []).map((item: any) => ({
          id: item.id,
          tipo_item: item.tipo_item,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          processo_id: item.processo_id,
          processo_numero: item.processo?.numero_cnj || null,
          processo_pasta: item.processo?.numero_pasta || null,
          partes_resumo:
            item.processo?.autor && item.processo?.reu
              ? `${item.processo.autor} vs ${item.processo.reu}`
              : null,
        }))

        // Calcular totais
        const subtotal_honorarios = itens
          .filter((i) => i.tipo_item === 'honorario')
          .reduce((sum, i) => sum + Number(i.valor_total), 0)

        const subtotal_horas = itens
          .filter((i) => i.tipo_item === 'timesheet')
          .reduce((sum, i) => sum + Number(i.valor_total), 0)

        const subtotal_despesas = itens
          .filter((i) => i.tipo_item === 'despesa')
          .reduce((sum, i) => sum + Number(i.valor_total), 0)

        const soma_horas = itens
          .filter((i) => i.tipo_item === 'timesheet')
          .reduce((sum, i) => sum + Number(i.quantidade || 0), 0)

        // Extrair telefone e email do config do escritório (se existir)
        const config = escritorioData.config || {}

        return {
          escritorio: {
            id: escritorioData.id,
            nome: escritorioData.nome,
            cnpj: escritorioData.cnpj,
            logo_url: escritorioData.logo_url,
            endereco: escritorioData.endereco,
            telefone: config.telefone || null,
            email: config.email || null,
          },
          fatura: {
            id: faturaData.id,
            numero_fatura: faturaData.numero_fatura,
            data_emissao: faturaData.data_emissao,
            data_vencimento: faturaData.data_vencimento,
            valor_total: Number(faturaData.valor_total),
            status: faturaData.status,
            observacoes: faturaData.observacoes,
            total_honorarios: Number(faturaData.total_honorarios || 0),
            total_horas: Number(faturaData.total_horas || 0),
            soma_horas: Number(faturaData.soma_horas || 0),
          },
          cliente: {
            id: clienteData.id,
            nome_completo: clienteData.nome_completo,
            nome_fantasia: clienteData.nome_fantasia,
            tipo_pessoa: clienteData.tipo_pessoa,
            cpf_cnpj: clienteData.cpf_cnpj,
            logradouro: clienteData.logradouro,
            numero: clienteData.numero,
            complemento: clienteData.complemento,
            bairro: clienteData.bairro,
            cidade: clienteData.cidade,
            uf: clienteData.uf,
            cep: clienteData.cep,
            email_principal: clienteData.email_principal,
            telefone_principal: clienteData.telefone_principal,
          },
          itens,
          totais: {
            subtotal_honorarios,
            subtotal_horas,
            subtotal_despesas,
            soma_horas,
            valor_total: Number(faturaData.valor_total),
          },
        }
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao carregar fatura para impressão:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  return {
    loading,
    error,
    loadFaturaCompleta,
  }
}
