'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface EscritorioND {
  nome: string
  cnpj: string | null
  logo_url: string | null
  telefone: string | null
  email: string | null
  endereco: any | null
}

export interface ClienteND {
  nome_completo: string
  nome_fantasia: string | null
  tipo_pessoa: 'pf' | 'pj'
  cpf_cnpj: string | null
  email_principal: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
}

export interface ItemND {
  id: string
  descricao: string
  valor: number
  categoria: string | null
  processo_titulo: string | null
}

export interface NotaDebitoImpressaoData {
  escritorio: EscritorioND
  nota: {
    id: string
    numero: string
    status: string
    valor_total: number
    data_emissao: string | null
    data_vencimento: string
    data_pagamento: string | null
    observacoes: string | null
  }
  cliente: ClienteND
  itens: ItemND[]
}

export function useNotaDebitoImpressao() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotaCompleta = useCallback(async (notaId: string): Promise<NotaDebitoImpressaoData | null> => {
    try {
      setLoading(true)
      setError(null)

      // Buscar nota
      const { data: nota, error: notaErr } = await supabase
        .from('financeiro_notas_debito')
        .select('*')
        .eq('id', notaId)
        .single()

      if (notaErr || !nota) {
        setError('Nota de débito não encontrada')
        return null
      }

      // Buscar escritório, cliente e itens em paralelo
      const [escritorioRes, clienteRes, itensRes] = await Promise.all([
        supabase
          .from('escritorios')
          .select('nome, cnpj, logo_url, telefone, email, endereco')
          .eq('id', nota.escritorio_id)
          .single(),
        supabase
          .from('crm_pessoas')
          .select('nome_completo, nome_fantasia, tipo_pessoa, cpf_cnpj, email_principal, logradouro, numero, complemento, bairro, cidade, uf, cep')
          .eq('id', nota.cliente_id)
          .single(),
        supabase
          .from('financeiro_notas_debito_itens')
          .select('id, descricao, valor, categoria, processo_titulo')
          .eq('nota_debito_id', notaId)
          .order('created_at'),
      ])

      if (!escritorioRes.data || !clienteRes.data) {
        setError('Dados incompletos')
        return null
      }

      return {
        escritorio: escritorioRes.data as EscritorioND,
        nota: {
          id: nota.id,
          numero: nota.numero,
          status: nota.status,
          valor_total: Number(nota.valor_total),
          data_emissao: nota.data_emissao,
          data_vencimento: nota.data_vencimento,
          data_pagamento: nota.data_pagamento,
          observacoes: nota.observacoes,
        },
        cliente: clienteRes.data as ClienteND,
        itens: (itensRes.data || []).map((i: any) => ({
          id: i.id,
          descricao: i.descricao,
          valor: Number(i.valor),
          categoria: i.categoria,
          processo_titulo: i.processo_titulo,
        })),
      }
    } catch (err) {
      console.error('Erro ao carregar nota:', err)
      setError('Erro ao carregar dados da nota')
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return { loading, error, loadNotaCompleta }
}
