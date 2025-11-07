export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      // ... tipos completos gerados pelo Supabase
    }
    Views: {
      v_contas_receber_pagar: {
        Row: {
          categoria: string | null
          cliente_fornecedor: string | null
          cliente_id: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          dias_atraso: number | null
          documento_referencia: string | null
          escritorio_id: string | null
          forma_pagamento: string | null
          id: string | null
          juros_aplicados: number | null
          numero_parcela: number | null
          observacoes: string | null
          origem_id: string | null
          prioridade: string | null
          status: string | null
          tipo_conta: string | null
          valor: number | null
          valor_pago: number | null
        }
      }
      v_faturas_dashboard: {
        Row: {
          categoria_urgencia: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          data_emissao: string | null
          data_vencimento: string | null
          dias_vencimento: number | null
          enviada_em: string | null
          escritorio_id: string | null
          gerada_automaticamente: boolean | null
          id: string | null
          nome_escritorio: string | null
          numero_fatura: string | null
          numero_parcelas: number | null
          paga_em: string | null
          parcelado: boolean | null
          qtd_itens: number | null
          status: string | null
          updated_at: string | null
          valor_total: number | null
        }
      }
      v_saldos_contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean | null
          banco: string | null
          conta_principal: boolean | null
          created_at: string | null
          data_abertura: string | null
          entradas_dia: number | null
          entradas_mes: number | null
          escritorio_id: string | null
          id: string | null
          nome_escritorio: string | null
          numero_conta: string | null
          saidas_dia: number | null
          saidas_mes: number | null
          saldo_atual: number | null
          saldo_inicial: number | null
          tipo_conta: string | null
          ultima_movimentacao: string | null
        }
      }
      v_timesheet_pendente_aprovacao: {
        Row: {
          aprovado: boolean | null
          atividade: string | null
          cliente_nome: string | null
          colaborador_nome: string | null
          created_at: string | null
          data_trabalho: string | null
          escritorio_id: string | null
          faturado: boolean | null
          faturavel: boolean | null
          horas: number | null
          id: string | null
          justificativa_reprovacao: string | null
          nome_escritorio: string | null
          numero_processo: string | null
          processo_id: string | null
          reprovado: boolean | null
          semana_trabalho: string | null
          updated_at: string | null
          user_id: string | null
        }
      }
    }
    Functions: {
      aprovar_timesheet: {
        Args: {
          p_aprovado_por: string
          p_observacoes?: string
          p_timesheet_ids: string[]
        }
        Returns: number
      }
      atualizar_status_parcelas: { Args: never; Returns: number }
      criar_honorario: {
        Args: {
          p_cliente_id: string
          p_consulta_id?: string
          p_data_vencimento_primeira?: string
          p_descricao: string
          p_escritorio_id: string
          p_etapas?: Json
          p_numero_parcelas?: number
          p_parcelado?: boolean
          p_processo_id?: string
          p_responsavel_id: string
          p_tipo_honorario: string
          p_valor_total: number
        }
        Returns: string
      }
      reprovar_timesheet: {
        Args: {
          p_justificativa: string
          p_reprovado_por: string
          p_timesheet_ids: string[]
        }
        Returns: number
      }
      user_pode_gerenciar_financeiro: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_tem_acesso_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
    }
  }
}