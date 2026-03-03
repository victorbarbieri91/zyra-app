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
      agenda_audiencias: {
        Row: {
          advogado_contrario: string | null
          comarca: string | null
          consultivo_id: string | null
          cor: string | null
          created_at: string | null
          criado_por: string | null
          data_hora: string
          descricao: string | null
          duracao_minutos: number | null
          endereco: string | null
          escritorio_id: string
          forum: string | null
          id: string
          juiz: string | null
          link_virtual: string | null
          modalidade: string
          observacoes: string | null
          plataforma: string | null
          preparativos_checklist: Json | null
          processo_id: string | null
          promotor: string | null
          responsaveis_ids: string[] | null
          responsavel_id: string | null
          resultado_descricao: string | null
          resultado_tipo: string | null
          sala: string | null
          status: string | null
          tipo_audiencia: string
          titulo: string
          tribunal: string | null
          updated_at: string | null
          vara: string | null
        }
        Insert: {
          advogado_contrario?: string | null
          comarca?: string | null
          consultivo_id?: string | null
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_hora: string
          descricao?: string | null
          duracao_minutos?: number | null
          endereco?: string | null
          escritorio_id: string
          forum?: string | null
          id?: string
          juiz?: string | null
          link_virtual?: string | null
          modalidade: string
          observacoes?: string | null
          plataforma?: string | null
          preparativos_checklist?: Json | null
          processo_id?: string | null
          promotor?: string | null
          responsaveis_ids?: string[] | null
          responsavel_id?: string | null
          resultado_descricao?: string | null
          resultado_tipo?: string | null
          sala?: string | null
          status?: string | null
          tipo_audiencia: string
          titulo: string
          tribunal?: string | null
          updated_at?: string | null
          vara?: string | null
        }
        Update: {
          advogado_contrario?: string | null
          comarca?: string | null
          consultivo_id?: string | null
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_hora?: string
          descricao?: string | null
          duracao_minutos?: number | null
          endereco?: string | null
          escritorio_id?: string
          forum?: string | null
          id?: string
          juiz?: string | null
          link_virtual?: string | null
          modalidade?: string
          observacoes?: string | null
          plataforma?: string | null
          preparativos_checklist?: Json | null
          processo_id?: string | null
          promotor?: string | null
          responsaveis_ids?: string[] | null
          responsavel_id?: string | null
          resultado_descricao?: string | null
          resultado_tipo?: string | null
          sala?: string | null
          status?: string | null
          tipo_audiencia?: string
          titulo?: string
          tribunal?: string | null
          updated_at?: string | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_audiencias_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "agenda_audiencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agenda_audiencias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "agenda_audiencias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_audiencias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agenda_eventos: {
        Row: {
          cliente_id: string | null
          consultivo_id: string | null
          cor: string | null
          created_at: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          dia_inteiro: boolean | null
          escritorio_id: string | null
          id: string
          local: string | null
          processo_id: string | null
          recorrencia_id: string | null
          responsaveis_ids: string[] | null
          responsavel_id: string | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          consultivo_id?: string | null
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          dia_inteiro?: boolean | null
          escritorio_id?: string | null
          id?: string
          local?: string | null
          processo_id?: string | null
          recorrencia_id?: string | null
          responsaveis_ids?: string[] | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          consultivo_id?: string | null
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          dia_inteiro?: boolean | null
          escritorio_id?: string | null
          id?: string
          local?: string | null
          processo_id?: string | null
          recorrencia_id?: string | null
          responsaveis_ids?: string[] | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_eventos_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_eventos_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "agenda_eventos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_eventos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agenda_eventos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_eventos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_eventos_recorrencia"
            columns: ["recorrencia_id"]
            isOneToOne: false
            referencedRelation: "agenda_recorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_recorrencias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          entidade_tipo: string
          escritorio_id: string
          exclusoes: string[] | null
          id: string
          max_ocorrencias: number | null
          proxima_execucao: string | null
          regra_apenas_uteis: boolean | null
          regra_dia_mes: number | null
          regra_dias_semana: number[] | null
          regra_frequencia: string
          regra_hora: string | null
          regra_intervalo: number | null
          regra_mes: number | null
          template_dados: Json
          template_descricao: string | null
          template_nome: string
          total_criados: number | null
          ultima_execucao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio: string
          entidade_tipo: string
          escritorio_id: string
          exclusoes?: string[] | null
          id?: string
          max_ocorrencias?: number | null
          proxima_execucao?: string | null
          regra_apenas_uteis?: boolean | null
          regra_dia_mes?: number | null
          regra_dias_semana?: number[] | null
          regra_frequencia: string
          regra_hora?: string | null
          regra_intervalo?: number | null
          regra_mes?: number | null
          template_dados: Json
          template_descricao?: string | null
          template_nome: string
          total_criados?: number | null
          ultima_execucao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          entidade_tipo?: string
          escritorio_id?: string
          exclusoes?: string[] | null
          id?: string
          max_ocorrencias?: number | null
          proxima_execucao?: string | null
          regra_apenas_uteis?: boolean | null
          regra_dia_mes?: number | null
          regra_dias_semana?: number[] | null
          regra_frequencia?: string
          regra_hora?: string | null
          regra_intervalo?: number | null
          regra_mes?: number | null
          template_dados?: Json
          template_descricao?: string | null
          template_nome?: string
          total_criados?: number | null
          ultima_execucao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_recorrencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_recorrencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agenda_recorrencias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_tarefas: {
        Row: {
          consultivo_id: string | null
          cor: string | null
          created_at: string | null
          criado_por: string | null
          data_conclusao: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          duracao_planejada_minutos: number | null
          escritorio_id: string
          fixa_status_data: string | null
          horario_planejado_dia: string | null
          id: string
          prazo_data_limite: string | null
          prazo_dias_uteis: boolean | null
          prioridade: string | null
          processo_id: string | null
          recorrencia_id: string | null
          responsaveis_ids: string[] | null
          responsavel_id: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          consultivo_id?: string | null
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_conclusao?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          duracao_planejada_minutos?: number | null
          escritorio_id: string
          fixa_status_data?: string | null
          horario_planejado_dia?: string | null
          id?: string
          prazo_data_limite?: string | null
          prazo_dias_uteis?: boolean | null
          prioridade?: string | null
          processo_id?: string | null
          recorrencia_id?: string | null
          responsaveis_ids?: string[] | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          consultivo_id?: string | null
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_conclusao?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          duracao_planejada_minutos?: number | null
          escritorio_id?: string
          fixa_status_data?: string | null
          horario_planejado_dia?: string | null
          id?: string
          prazo_data_limite?: string | null
          prazo_dias_uteis?: boolean | null
          prioridade?: string | null
          processo_id?: string | null
          recorrencia_id?: string | null
          responsaveis_ids?: string[] | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_tarefas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "agenda_tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agenda_tarefas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "agenda_tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_tarefas_recorrencia"
            columns: ["recorrencia_id"]
            isOneToOne: false
            referencedRelation: "agenda_recorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_credito: {
        Row: {
          ativo: boolean | null
          banco: string | null
          bandeira: string | null
          cor: string | null
          created_at: string | null
          dia_vencimento: number
          dias_antes_fechamento: number
          escritorio_id: string
          id: string
          limite_total: number | null
          nome: string
          observacoes: string | null
          ultimos_digitos: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          banco?: string | null
          bandeira?: string | null
          cor?: string | null
          created_at?: string | null
          dia_vencimento: number
          dias_antes_fechamento?: number
          escritorio_id: string
          id?: string
          limite_total?: number | null
          nome: string
          observacoes?: string | null
          ultimos_digitos?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          banco?: string | null
          bandeira?: string | null
          cor?: string | null
          created_at?: string | null
          dia_vencimento?: number
          dias_antes_fechamento?: number
          escritorio_id?: string
          id?: string
          limite_total?: number | null
          nome?: string
          observacoes?: string | null
          ultimos_digitos?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_credito_categorias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          escritorio_id: string
          id: string
          label: string
          updated_at: string | null
          value: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          escritorio_id: string
          id?: string
          label: string
          updated_at?: string | null
          value: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          escritorio_id?: string
          id?: string
          label?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_categorias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_categorias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cartoes_credito_categorias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_credito_despesas: {
        Row: {
          cartao_id: string
          categoria: string
          comprovante_url: string | null
          created_at: string | null
          data_compra: string
          descricao: string
          documento_fiscal: string | null
          escritorio_id: string
          fornecedor: string | null
          hash_transacao: string | null
          id: string
          importado_de_fatura: boolean | null
          numero_parcelas: number
          processo_id: string | null
          updated_at: string | null
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          cartao_id: string
          categoria: string
          comprovante_url?: string | null
          created_at?: string | null
          data_compra: string
          descricao: string
          documento_fiscal?: string | null
          escritorio_id: string
          fornecedor?: string | null
          hash_transacao?: string | null
          id?: string
          importado_de_fatura?: boolean | null
          numero_parcelas?: number
          processo_id?: string | null
          updated_at?: string | null
          valor_parcela: number
          valor_total: number
        }
        Update: {
          cartao_id?: string
          categoria?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_compra?: string
          descricao?: string
          documento_fiscal?: string | null
          escritorio_id?: string
          fornecedor?: string | null
          hash_transacao?: string | null
          id?: string
          importado_de_fatura?: boolean | null
          numero_parcelas?: number
          processo_id?: string | null
          updated_at?: string | null
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_despesas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_despesas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      cartoes_credito_faturas: {
        Row: {
          cartao_id: string
          created_at: string | null
          data_fechamento: string
          data_pagamento: string | null
          data_vencimento: string
          despesa_id: string | null
          escritorio_id: string
          forma_pagamento: string | null
          id: string
          mes_referencia: string
          pdf_url: string | null
          status: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          cartao_id: string
          created_at?: string | null
          data_fechamento: string
          data_pagamento?: string | null
          data_vencimento: string
          despesa_id?: string | null
          escritorio_id: string
          forma_pagamento?: string | null
          id?: string
          mes_referencia: string
          pdf_url?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          cartao_id?: string
          created_at?: string | null
          data_fechamento?: string
          data_pagamento?: string | null
          data_vencimento?: string
          despesa_id?: string | null
          escritorio_id?: string
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string
          pdf_url?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_faturas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_faturas_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "financeiro_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_faturas_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "v_despesas_reembolsaveis_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_faturas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_credito_importacoes: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          cartao_id: string
          confianca_media: number | null
          created_at: string | null
          dados_extraidos: Json | null
          erro_mensagem: string | null
          escritorio_id: string
          fatura_id: string | null
          id: string
          modelo_ia: string | null
          processado_em: string | null
          status: string
          transacoes_duplicadas: number | null
          transacoes_encontradas: number | null
          transacoes_importadas: number | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          cartao_id: string
          confianca_media?: number | null
          created_at?: string | null
          dados_extraidos?: Json | null
          erro_mensagem?: string | null
          escritorio_id: string
          fatura_id?: string | null
          id?: string
          modelo_ia?: string | null
          processado_em?: string | null
          status?: string
          transacoes_duplicadas?: number | null
          transacoes_encontradas?: number | null
          transacoes_importadas?: number | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          cartao_id?: string
          confianca_media?: number | null
          created_at?: string | null
          dados_extraidos?: Json | null
          erro_mensagem?: string | null
          escritorio_id?: string
          fatura_id?: string | null
          id?: string
          modelo_ia?: string | null
          processado_em?: string | null
          status?: string
          transacoes_duplicadas?: number | null
          transacoes_encontradas?: number | null
          transacoes_importadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_importacoes_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_importacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_importacoes_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito_faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_credito_lancamentos: {
        Row: {
          cartao_id: string
          categoria: string
          compra_id: string
          comprovante_url: string | null
          created_at: string | null
          data_compra: string
          descricao: string
          documento_fiscal: string | null
          escritorio_id: string
          fatura_id: string | null
          faturado: boolean | null
          fornecedor: string | null
          hash_transacao: string | null
          id: string
          importado_de_fatura: boolean | null
          mes_referencia: string
          observacoes: string | null
          parcela_numero: number
          parcela_total: number
          processo_id: string | null
          recorrente_ativo: boolean | null
          recorrente_data_fim: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          cartao_id: string
          categoria: string
          compra_id: string
          comprovante_url?: string | null
          created_at?: string | null
          data_compra: string
          descricao: string
          documento_fiscal?: string | null
          escritorio_id: string
          fatura_id?: string | null
          faturado?: boolean | null
          fornecedor?: string | null
          hash_transacao?: string | null
          id?: string
          importado_de_fatura?: boolean | null
          mes_referencia: string
          observacoes?: string | null
          parcela_numero?: number
          parcela_total?: number
          processo_id?: string | null
          recorrente_ativo?: boolean | null
          recorrente_data_fim?: string | null
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          cartao_id?: string
          categoria?: string
          compra_id?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_compra?: string
          descricao?: string
          documento_fiscal?: string | null
          escritorio_id?: string
          fatura_id?: string | null
          faturado?: boolean | null
          fornecedor?: string | null
          hash_transacao?: string | null
          id?: string
          importado_de_fatura?: boolean | null
          mes_referencia?: string
          observacoes?: string | null
          parcela_numero?: number
          parcela_total?: number
          processo_id?: string | null
          recorrente_ativo?: boolean | null
          recorrente_data_fim?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_lancamentos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_lancamentos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_lancamentos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_lancamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_lancamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_lancamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_credito_lancamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      cartoes_credito_parcelas: {
        Row: {
          created_at: string | null
          despesa_id: string
          fatura_id: string | null
          faturada: boolean | null
          id: string
          mes_referencia: string
          numero_parcela: number
          valor: number
        }
        Insert: {
          created_at?: string | null
          despesa_id: string
          fatura_id?: string | null
          faturada?: boolean | null
          id?: string
          mes_referencia: string
          numero_parcela: number
          valor: number
        }
        Update: {
          created_at?: string | null
          despesa_id?: string
          fatura_id?: string | null
          faturada?: boolean | null
          id?: string
          mes_referencia?: string
          numero_parcela?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_credito_parcelas_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parcela_fatura"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito_faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_comando_acoes_pendentes: {
        Row: {
          confirmado: boolean | null
          confirmado_em: string | null
          created_at: string | null
          dados: Json
          erro: string | null
          escritorio_id: string
          executado: boolean | null
          executado_em: string | null
          expira_em: string | null
          explicacao: string | null
          id: string
          idempotency_key: string | null
          operation_name: string | null
          preview_human: string | null
          resolved_entities: Json | null
          resultado: Json | null
          run_id: string | null
          sessao_id: string | null
          tabela: string
          target_label: string | null
          tipo_acao: string
          user_id: string
          validated_payload: Json | null
        }
        Insert: {
          confirmado?: boolean | null
          confirmado_em?: string | null
          created_at?: string | null
          dados: Json
          erro?: string | null
          escritorio_id: string
          executado?: boolean | null
          executado_em?: string | null
          expira_em?: string | null
          explicacao?: string | null
          id?: string
          idempotency_key?: string | null
          operation_name?: string | null
          preview_human?: string | null
          resolved_entities?: Json | null
          resultado?: Json | null
          run_id?: string | null
          sessao_id?: string | null
          tabela: string
          target_label?: string | null
          tipo_acao: string
          user_id: string
          validated_payload?: Json | null
        }
        Update: {
          confirmado?: boolean | null
          confirmado_em?: string | null
          created_at?: string | null
          dados?: Json
          erro?: string | null
          escritorio_id?: string
          executado?: boolean | null
          executado_em?: string | null
          expira_em?: string | null
          explicacao?: string | null
          id?: string
          idempotency_key?: string | null
          operation_name?: string | null
          preview_human?: string | null
          resolved_entities?: Json | null
          resultado?: Json | null
          run_id?: string | null
          sessao_id?: string | null
          tabela?: string
          target_label?: string | null
          tipo_acao?: string
          user_id?: string
          validated_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_acoes_pendentes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_acoes_pendentes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "centro_comando_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_comando_embedding_cache: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          input_hash: string
          input_text: string
          modelo: string | null
          ultimo_uso: string | null
          uso_count: number | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          input_hash: string
          input_text: string
          modelo?: string | null
          ultimo_uso?: string | null
          uso_count?: number | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          input_hash?: string
          input_text?: string
          modelo?: string | null
          ultimo_uso?: string | null
          uso_count?: number | null
        }
        Relationships: []
      }
      centro_comando_execucoes: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          escritorio_id: string
          finished_at: string | null
          flow_type: string
          had_confirmation_modal: boolean
          had_error: boolean
          had_input_modal: boolean
          had_write: boolean
          id: string
          iteration_count: number
          run_id: string
          sessao_id: string | null
          started_at: string
          stream_mode: string
          tempo_execucao_ms: number | null
          termination_reason: string
          tokens_input: number | null
          tokens_output: number | null
          tool_repetition_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          escritorio_id: string
          finished_at?: string | null
          flow_type?: string
          had_confirmation_modal?: boolean
          had_error?: boolean
          had_input_modal?: boolean
          had_write?: boolean
          id?: string
          iteration_count?: number
          run_id: string
          sessao_id?: string | null
          started_at?: string
          stream_mode?: string
          tempo_execucao_ms?: number | null
          termination_reason?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tool_repetition_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          escritorio_id?: string
          finished_at?: string | null
          flow_type?: string
          had_confirmation_modal?: boolean
          had_error?: boolean
          had_input_modal?: boolean
          had_write?: boolean
          id?: string
          iteration_count?: number
          run_id?: string
          sessao_id?: string | null
          started_at?: string
          stream_mode?: string
          tempo_execucao_ms?: number | null
          termination_reason?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tool_repetition_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_execucoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_execucoes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "centro_comando_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_execucoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_execucoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      centro_comando_favoritos: {
        Row: {
          categoria: string | null
          comando: string
          compartilhado_equipe: boolean | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          ultimo_uso: string | null
          updated_at: string | null
          user_id: string
          uso_count: number | null
        }
        Insert: {
          categoria?: string | null
          comando: string
          compartilhado_equipe?: boolean | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          ultimo_uso?: string | null
          updated_at?: string | null
          user_id: string
          uso_count?: number | null
        }
        Update: {
          categoria?: string | null
          comando?: string
          compartilhado_equipe?: boolean | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          ultimo_uso?: string | null
          updated_at?: string | null
          user_id?: string
          uso_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_favoritos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_comando_feedback: {
        Row: {
          assistant_response: string | null
          comentario: string | null
          correcao_aplicada: boolean | null
          created_at: string | null
          embedding: string | null
          escritorio_id: string
          id: string
          incorporado_conhecimento: boolean | null
          incorporado_em: string | null
          mensagem_id: string | null
          query_executada: string | null
          rating: number | null
          resposta_esperada: string | null
          sessao_id: string | null
          tipo_feedback: string
          tool_calls: Json | null
          user_id: string
          user_message: string | null
        }
        Insert: {
          assistant_response?: string | null
          comentario?: string | null
          correcao_aplicada?: boolean | null
          created_at?: string | null
          embedding?: string | null
          escritorio_id: string
          id?: string
          incorporado_conhecimento?: boolean | null
          incorporado_em?: string | null
          mensagem_id?: string | null
          query_executada?: string | null
          rating?: number | null
          resposta_esperada?: string | null
          sessao_id?: string | null
          tipo_feedback: string
          tool_calls?: Json | null
          user_id: string
          user_message?: string | null
        }
        Update: {
          assistant_response?: string | null
          comentario?: string | null
          correcao_aplicada?: boolean | null
          created_at?: string | null
          embedding?: string | null
          escritorio_id?: string
          id?: string
          incorporado_conhecimento?: boolean | null
          incorporado_em?: string | null
          mensagem_id?: string | null
          query_executada?: string | null
          rating?: number | null
          resposta_esperada?: string | null
          sessao_id?: string | null
          tipo_feedback?: string
          tool_calls?: Json | null
          user_id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_feedback_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_feedback_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "centro_comando_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      centro_comando_historico: {
        Row: {
          content: string
          created_at: string | null
          erro: string | null
          escritorio_id: string
          flow_type: string | null
          had_confirmation_modal: boolean
          had_error: boolean
          had_input_modal: boolean
          had_write: boolean
          id: string
          iteration_count: number
          role: string
          run_id: string | null
          sessao_id: string | null
          stream_mode: string | null
          tempo_execucao_ms: number | null
          termination_reason: string | null
          tokens_input: number | null
          tokens_output: number | null
          tool_calls: Json | null
          tool_results: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          erro?: string | null
          escritorio_id: string
          flow_type?: string | null
          had_confirmation_modal?: boolean
          had_error?: boolean
          had_input_modal?: boolean
          had_write?: boolean
          id?: string
          iteration_count?: number
          role: string
          run_id?: string | null
          sessao_id?: string | null
          stream_mode?: string | null
          tempo_execucao_ms?: number | null
          termination_reason?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          erro?: string | null
          escritorio_id?: string
          flow_type?: string | null
          had_confirmation_modal?: boolean
          had_error?: boolean
          had_input_modal?: boolean
          had_write?: boolean
          id?: string
          iteration_count?: number
          role?: string
          run_id?: string | null
          sessao_id?: string | null
          stream_mode?: string | null
          tempo_execucao_ms?: number | null
          termination_reason?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_historico_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_historico_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "centro_comando_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_comando_inputs_pendentes: {
        Row: {
          contexto: string
          created_at: string
          escritorio_id: string
          expira_em: string | null
          id: string
          respondido_em: string | null
          run_id: string
          schema: Json
          sessao_id: string
          status: string
          tipo: string
          user_id: string
          values: Json | null
        }
        Insert: {
          contexto: string
          created_at?: string
          escritorio_id: string
          expira_em?: string | null
          id?: string
          respondido_em?: string | null
          run_id: string
          schema: Json
          sessao_id: string
          status?: string
          tipo: string
          user_id: string
          values?: Json | null
        }
        Update: {
          contexto?: string
          created_at?: string
          escritorio_id?: string
          expira_em?: string | null
          id?: string
          respondido_em?: string | null
          run_id?: string
          schema?: Json
          sessao_id?: string
          status?: string
          tipo?: string
          user_id?: string
          values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_inputs_pendentes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_inputs_pendentes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "centro_comando_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_inputs_pendentes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_inputs_pendentes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      centro_comando_knowledge_base: {
        Row: {
          chunk_id: string
          content: string
          created_at: string | null
          embedding: string | null
          hash: string | null
          id: string
          metadata: Json | null
          source: string
          source_path: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          chunk_id: string
          content: string
          created_at?: string | null
          embedding?: string | null
          hash?: string | null
          id?: string
          metadata?: Json | null
          source: string
          source_path?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          chunk_id?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          hash?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          source_path?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      centro_comando_memories: {
        Row: {
          ativo: boolean | null
          content: string
          content_resumido: string | null
          created_at: string | null
          embedding: string | null
          entidade: string | null
          entidade_id: string | null
          escritorio_id: string
          expira_em: string | null
          id: string
          mensagem_origem_id: string | null
          permanente: boolean | null
          relevancia_score: number | null
          sessao_id: string | null
          tipo: string
          ultimo_uso: string | null
          updated_at: string | null
          user_id: string
          uso_count: number | null
        }
        Insert: {
          ativo?: boolean | null
          content: string
          content_resumido?: string | null
          created_at?: string | null
          embedding?: string | null
          entidade?: string | null
          entidade_id?: string | null
          escritorio_id: string
          expira_em?: string | null
          id?: string
          mensagem_origem_id?: string | null
          permanente?: boolean | null
          relevancia_score?: number | null
          sessao_id?: string | null
          tipo: string
          ultimo_uso?: string | null
          updated_at?: string | null
          user_id: string
          uso_count?: number | null
        }
        Update: {
          ativo?: boolean | null
          content?: string
          content_resumido?: string | null
          created_at?: string | null
          embedding?: string | null
          entidade?: string | null
          entidade_id?: string | null
          escritorio_id?: string
          expira_em?: string | null
          id?: string
          mensagem_origem_id?: string | null
          permanente?: boolean | null
          relevancia_score?: number | null
          sessao_id?: string | null
          tipo?: string
          ultimo_uso?: string | null
          updated_at?: string | null
          user_id?: string
          uso_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_memories_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_memories_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "centro_comando_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_comando_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      centro_comando_sessoes: {
        Row: {
          ativo: boolean | null
          contexto: Json | null
          created_at: string | null
          escritorio_id: string
          fim: string | null
          id: string
          inicio: string | null
          mensagens_count: number | null
          titulo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          contexto?: Json | null
          created_at?: string | null
          escritorio_id: string
          fim?: string | null
          id?: string
          inicio?: string | null
          mensagens_count?: number | null
          titulo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          contexto?: Json | null
          created_at?: string | null
          escritorio_id?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          mensagens_count?: number | null
          titulo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_comando_sessoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      consultivo_consultas: {
        Row: {
          andamentos: Json | null
          anexos: Json | null
          area: string
          cliente_id: string
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          numero: string | null
          prazo: string | null
          prioridade: string
          responsavel_id: string
          status: Database["public"]["Enums"]["status_consultivo"]
          titulo: string
          updated_at: string | null
        }
        Insert: {
          andamentos?: Json | null
          anexos?: Json | null
          area: string
          cliente_id: string
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          numero?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_id: string
          status?: Database["public"]["Enums"]["status_consultivo"]
          titulo: string
          updated_at?: string | null
        }
        Update: {
          andamentos?: Json | null
          anexos?: Json | null
          area?: string
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          numero?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string
          status?: Database["public"]["Enums"]["status_consultivo"]
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultivo_consultas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "consultivo_consultas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "consultivo_consultas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      consultivo_timeline: {
        Row: {
          consulta_id: string
          created_at: string | null
          descricao: string | null
          escritorio_id: string | null
          id: string
          metadata: Json | null
          tipo_acao: string
          user_id: string | null
        }
        Insert: {
          consulta_id: string
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string | null
          id?: string
          metadata?: Json | null
          tipo_acao: string
          user_id?: string | null
        }
        Update: {
          consulta_id?: string
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string | null
          id?: string
          metadata?: Json | null
          tipo_acao?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultivo_timeline_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_timeline_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_timeline_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "consultivo_timeline_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_timeline_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_timeline_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crm_oportunidades: {
        Row: {
          area_juridica:
            | Database["public"]["Enums"]["area_juridica_enum"]
            | null
          created_at: string
          data_abertura: string
          data_fechamento: string | null
          data_prevista_fechamento: string | null
          descricao: string | null
          escritorio_id: string
          etapa: Database["public"]["Enums"]["etapa_oportunidade_enum"]
          id: string
          indicado_por: string | null
          interacoes: Json | null
          motivo_perda: Database["public"]["Enums"]["motivo_perda_enum"] | null
          origem: Database["public"]["Enums"]["origem_crm_enum"] | null
          pessoa_id: string
          probabilidade: number | null
          responsavel_id: string
          tags: string[] | null
          titulo: string
          updated_at: string
          valor_estimado: number | null
          valor_fechado: number | null
        }
        Insert: {
          area_juridica?:
            | Database["public"]["Enums"]["area_juridica_enum"]
            | null
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          data_prevista_fechamento?: string | null
          descricao?: string | null
          escritorio_id: string
          etapa?: Database["public"]["Enums"]["etapa_oportunidade_enum"]
          id?: string
          indicado_por?: string | null
          interacoes?: Json | null
          motivo_perda?: Database["public"]["Enums"]["motivo_perda_enum"] | null
          origem?: Database["public"]["Enums"]["origem_crm_enum"] | null
          pessoa_id: string
          probabilidade?: number | null
          responsavel_id: string
          tags?: string[] | null
          titulo: string
          updated_at?: string
          valor_estimado?: number | null
          valor_fechado?: number | null
        }
        Update: {
          area_juridica?:
            | Database["public"]["Enums"]["area_juridica_enum"]
            | null
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          data_prevista_fechamento?: string | null
          descricao?: string | null
          escritorio_id?: string
          etapa?: Database["public"]["Enums"]["etapa_oportunidade_enum"]
          id?: string
          indicado_por?: string | null
          interacoes?: Json | null
          motivo_perda?: Database["public"]["Enums"]["motivo_perda_enum"] | null
          origem?: Database["public"]["Enums"]["origem_crm_enum"] | null
          pessoa_id?: string
          probabilidade?: number | null
          responsavel_id?: string
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          valor_estimado?: number | null
          valor_fechado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidades_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_indicado_por_fkey"
            columns: ["indicado_por"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_indicado_por_fkey"
            columns: ["indicado_por"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crm_pessoas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          escritorio_id: string
          id: string
          indicado_por: string | null
          logradouro: string | null
          nome_completo: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_crm_enum"] | null
          status: Database["public"]["Enums"]["status_pessoa_enum"]
          tags: string[] | null
          telefone: string | null
          tipo_cadastro: Database["public"]["Enums"]["tipo_cadastro_enum"]
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_enum"]
          uf: Database["public"]["Enums"]["uf_enum"] | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          escritorio_id: string
          id?: string
          indicado_por?: string | null
          logradouro?: string | null
          nome_completo: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_crm_enum"] | null
          status?: Database["public"]["Enums"]["status_pessoa_enum"]
          tags?: string[] | null
          telefone?: string | null
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro_enum"]
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"]
          uf?: Database["public"]["Enums"]["uf_enum"] | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          escritorio_id?: string
          id?: string
          indicado_por?: string | null
          logradouro?: string | null
          nome_completo?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_crm_enum"] | null
          status?: Database["public"]["Enums"]["status_pessoa_enum"]
          tags?: string[] | null
          telefone?: string | null
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro_enum"]
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"]
          uf?: Database["public"]["Enums"]["uf_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_indicado_por_fkey"
            columns: ["indicado_por"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_indicado_por_fkey"
            columns: ["indicado_por"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_run_details: {
        Row: {
          end_time: string | null
          error_message: string | null
          id: string
          job_name: string
          result: Json | null
          start_time: string
          status: string | null
        }
        Insert: {
          end_time?: string | null
          error_message?: string | null
          id?: string
          job_name: string
          result?: Json | null
          start_time?: string
          status?: string | null
        }
        Update: {
          end_time?: string | null
          error_message?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          start_time?: string
          status?: string | null
        }
        Relationships: []
      }
      dashboard_resumo_cache: {
        Row: {
          created_at: string | null
          dados: Json
          data_referencia: string
          escritorio_id: string
          gerado_em: string | null
          gerado_por_ia: boolean | null
          id: string
          mensagem: string
          periodo_geracao: string
          saudacao: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dados?: Json
          data_referencia: string
          escritorio_id: string
          gerado_em?: string | null
          gerado_por_ia?: boolean | null
          id?: string
          mensagem: string
          periodo_geracao: string
          saudacao: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dados?: Json
          data_referencia?: string
          escritorio_id?: string
          gerado_em?: string | null
          gerado_por_ia?: boolean | null
          id?: string
          mensagem?: string
          periodo_geracao?: string
          saudacao?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_resumo_cache_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      datajud_consultas: {
        Row: {
          consultado_em: string
          created_at: string | null
          dados_normalizados: Json
          expira_em: string
          id: string
          numero_cnj: string
          tribunal: string | null
          user_id: string | null
        }
        Insert: {
          consultado_em?: string
          created_at?: string | null
          dados_normalizados: Json
          expira_em: string
          id?: string
          numero_cnj: string
          tribunal?: string | null
          user_id?: string | null
        }
        Update: {
          consultado_em?: string
          created_at?: string | null
          dados_normalizados?: Json
          expira_em?: string
          id?: string
          numero_cnj?: string
          tribunal?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datajud_consultas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datajud_consultas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      documentos: {
        Row: {
          categoria: string | null
          consulta_id: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          mime_type: string | null
          nome: string
          processo_id: string | null
          storage_path: string | null
          tags: string[] | null
          tamanho: number | null
          tipo: string | null
          updated_at: string | null
          versao: number | null
          versao_anterior_id: string | null
        }
        Insert: {
          categoria?: string | null
          consulta_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          mime_type?: string | null
          nome: string
          processo_id?: string | null
          storage_path?: string | null
          tags?: string[] | null
          tamanho?: number | null
          tipo?: string | null
          updated_at?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Update: {
          categoria?: string | null
          consulta_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          mime_type?: string | null
          nome?: string
          processo_id?: string | null
          storage_path?: string | null
          tags?: string[] | null
          tamanho?: number | null
          tipo?: string | null
          updated_at?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documentos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "documentos_versao_anterior_id_fkey"
            columns: ["versao_anterior_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          documento_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          documento_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          documento_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documentos_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags_master"
            referencedColumns: ["id"]
          },
        ]
      }
      escavador_cache: {
        Row: {
          consultado_em: string | null
          dados_capa: Json
          dados_movimentacoes: Json | null
          dados_partes: Json | null
          expira_em: string | null
          id: string
          numero_cnj: string
        }
        Insert: {
          consultado_em?: string | null
          dados_capa: Json
          dados_movimentacoes?: Json | null
          dados_partes?: Json | null
          expira_em?: string | null
          id?: string
          numero_cnj: string
        }
        Update: {
          consultado_em?: string | null
          dados_capa?: Json
          dados_movimentacoes?: Json | null
          dados_partes?: Json | null
          expira_em?: string | null
          id?: string
          numero_cnj?: string
        }
        Relationships: []
      }
      escavador_config: {
        Row: {
          callback_token: string | null
          callback_url: string | null
          created_at: string | null
          creditos_usados_mes: number | null
          escritorio_id: string
          id: string
          monitoramento_ativo: boolean | null
          ultimo_reset_creditos: string | null
          updated_at: string | null
        }
        Insert: {
          callback_token?: string | null
          callback_url?: string | null
          created_at?: string | null
          creditos_usados_mes?: number | null
          escritorio_id: string
          id?: string
          monitoramento_ativo?: boolean | null
          ultimo_reset_creditos?: string | null
          updated_at?: string | null
        }
        Update: {
          callback_token?: string | null
          callback_url?: string | null
          created_at?: string | null
          creditos_usados_mes?: number | null
          escritorio_id?: string
          id?: string
          monitoramento_ativo?: boolean | null
          ultimo_reset_creditos?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escavador_config_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: true
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      escritorios: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          config: Json | null
          created_at: string | null
          descricao: string | null
          email: string | null
          endereco: Json | null
          grupo_id: string
          id: string
          logo_url: string | null
          max_usuarios: number | null
          nome: string
          owner_id: string | null
          plano: string | null
          setup_completado_em: string | null
          setup_completo: boolean | null
          setup_etapa_atual: string | null
          site: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          config?: Json | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          endereco?: Json | null
          grupo_id: string
          id?: string
          logo_url?: string | null
          max_usuarios?: number | null
          nome: string
          owner_id?: string | null
          plano?: string | null
          setup_completado_em?: string | null
          setup_completo?: boolean | null
          setup_etapa_atual?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          config?: Json | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          endereco?: Json | null
          grupo_id?: string
          id?: string
          logo_url?: string | null
          max_usuarios?: number | null
          nome?: string
          owner_id?: string | null
          plano?: string | null
          setup_completado_em?: string | null
          setup_completo?: boolean | null
          setup_etapa_atual?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escritorios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escritorios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      escritorios_cargos: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          nivel: number
          nome: string
          nome_display: string
          updated_at: string | null
          valor_hora_padrao: number | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          nivel: number
          nome: string
          nome_display: string
          updated_at?: string | null
          valor_hora_padrao?: number | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          nivel?: number
          nome?: string
          nome_display?: string
          updated_at?: string | null
          valor_hora_padrao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_cargos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      escritorios_cargos_permissoes: {
        Row: {
          cargo_id: string
          created_at: string | null
          id: string
          modulo: string
          pode_criar: boolean | null
          pode_editar: boolean | null
          pode_excluir: boolean | null
          pode_exportar: boolean | null
          pode_visualizar: boolean | null
          updated_at: string | null
        }
        Insert: {
          cargo_id: string
          created_at?: string | null
          id?: string
          modulo: string
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_exportar?: boolean | null
          pode_visualizar?: boolean | null
          updated_at?: string | null
        }
        Update: {
          cargo_id?: string
          created_at?: string | null
          id?: string
          modulo?: string
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_exportar?: boolean | null
          pode_visualizar?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_cargos_permissoes_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "escritorios_cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      escritorios_convites: {
        Row: {
          aceito: boolean | null
          aceito_em: string | null
          aceito_por: string | null
          cargo_id: string | null
          convidado_por: string
          created_at: string | null
          email: string
          escritorio_id: string
          expira_em: string | null
          id: string
          role: string
          token: string | null
        }
        Insert: {
          aceito?: boolean | null
          aceito_em?: string | null
          aceito_por?: string | null
          cargo_id?: string | null
          convidado_por: string
          created_at?: string | null
          email: string
          escritorio_id: string
          expira_em?: string | null
          id?: string
          role: string
          token?: string | null
        }
        Update: {
          aceito?: boolean | null
          aceito_em?: string | null
          aceito_por?: string | null
          cargo_id?: string | null
          convidado_por?: string
          created_at?: string | null
          email?: string
          escritorio_id?: string
          expira_em?: string | null
          id?: string
          role?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_convites_aceito_por_fkey"
            columns: ["aceito_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escritorios_convites_aceito_por_fkey"
            columns: ["aceito_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "escritorios_convites_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "escritorios_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escritorios_convites_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escritorios_convites_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "escritorios_convites_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      escritorios_permissoes: {
        Row: {
          created_at: string | null
          id: string
          modulo: string
          permissoes: string[] | null
          usuario_escritorio_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          modulo: string
          permissoes?: string[] | null
          usuario_escritorio_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          modulo?: string
          permissoes?: string[] | null
          usuario_escritorio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_permissoes_usuario_escritorio_id_fkey"
            columns: ["usuario_escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      escritorios_usuarios: {
        Row: {
          ativo: boolean | null
          cargo_id: string | null
          convidado_em: string | null
          convidado_por: string | null
          created_at: string | null
          escritorio_id: string
          id: string
          is_owner: boolean | null
          meta_horas_mensal: number | null
          percentual_comissao: number | null
          role: string
          salario_base: number | null
          ultimo_acesso: string | null
          user_id: string
          valor_hora: number | null
        }
        Insert: {
          ativo?: boolean | null
          cargo_id?: string | null
          convidado_em?: string | null
          convidado_por?: string | null
          created_at?: string | null
          escritorio_id: string
          id?: string
          is_owner?: boolean | null
          meta_horas_mensal?: number | null
          percentual_comissao?: number | null
          role: string
          salario_base?: number | null
          ultimo_acesso?: string | null
          user_id: string
          valor_hora?: number | null
        }
        Update: {
          ativo?: boolean | null
          cargo_id?: string | null
          convidado_em?: string | null
          convidado_por?: string | null
          created_at?: string | null
          escritorio_id?: string
          id?: string
          is_owner?: boolean | null
          meta_horas_mensal?: number | null
          percentual_comissao?: number | null
          role?: string
          salario_base?: number | null
          ultimo_acesso?: string | null
          user_id?: string
          valor_hora?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_usuarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "escritorios_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escritorios_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escritorios_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "usuarios_escritorios_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escritorios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escritorios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      escritorios_usuarios_ativo: {
        Row: {
          escritorio_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          escritorio_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          escritorio_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_escritorio_ativo_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escritorio_ativo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escritorio_ativo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financeiro_alertas_cobranca: {
        Row: {
          ato_tipo_id: string | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          justificativa_ignorado: string | null
          movimentacao_id: string | null
          processo_id: string
          receita_id: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          tipo_alerta: string
          titulo: string
          updated_at: string | null
          valor_sugerido: number | null
        }
        Insert: {
          ato_tipo_id?: string | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          justificativa_ignorado?: string | null
          movimentacao_id?: string | null
          processo_id: string
          receita_id?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo_alerta?: string
          titulo: string
          updated_at?: string | null
          valor_sugerido?: number | null
        }
        Update: {
          ato_tipo_id?: string | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          justificativa_ignorado?: string | null
          movimentacao_id?: string | null
          processo_id?: string
          receita_id?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo_alerta?: string
          titulo?: string
          updated_at?: string | null
          valor_sugerido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_alertas_cobranca_ato_tipo_id_fkey"
            columns: ["ato_tipo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_atos_processuais_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financeiro_alertas_limite_contrato: {
        Row: {
          cliente_id: string
          contrato_id: string
          created_at: string | null
          escritorio_id: string
          id: string
          limite_meses: number
          mensagem: string
          meses_cobrados: number
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          titulo: string
        }
        Insert: {
          cliente_id: string
          contrato_id: string
          created_at?: string | null
          escritorio_id: string
          id?: string
          limite_meses: number
          mensagem: string
          meses_cobrados: number
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          titulo: string
        }
        Update: {
          cliente_id?: string
          contrato_id?: string
          created_at?: string | null
          escritorio_id?: string
          id?: string
          limite_meses?: number
          mensagem?: string
          meses_cobrados?: number
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_limite_contrato_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financeiro_atos_processuais_tipos: {
        Row: {
          area_juridica: string
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          nome: string
          ordem: number | null
          percentual_padrao: number | null
          updated_at: string | null
          valor_fixo_padrao: number | null
        }
        Insert: {
          area_juridica: string
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          nome: string
          ordem?: number | null
          percentual_padrao?: number | null
          updated_at?: string | null
          valor_fixo_padrao?: number | null
        }
        Update: {
          area_juridica?: string
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          percentual_padrao?: number | null
          updated_at?: string | null
          valor_fixo_padrao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_atos_processuais_tipos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean | null
          banco: string
          conta_principal: boolean | null
          created_at: string | null
          data_abertura: string | null
          escritorio_id: string
          id: string
          numero_conta: string | null
          saldo_atual: number
          saldo_inicial: number
          tipo_conta: string
          titular: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean | null
          banco: string
          conta_principal?: boolean | null
          created_at?: string | null
          data_abertura?: string | null
          escritorio_id: string
          id?: string
          numero_conta?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          tipo_conta: string
          titular?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativa?: boolean | null
          banco?: string
          conta_principal?: boolean | null
          created_at?: string | null
          data_abertura?: string | null
          escritorio_id?: string
          id?: string
          numero_conta?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          tipo_conta?: string
          titular?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_contratos_honorarios: {
        Row: {
          ativo: boolean | null
          atos: Json | null
          clausulas: string | null
          cliente_id: string
          config: Json | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          data_ultimo_reajuste: string | null
          descricao: string | null
          escritorio_cobranca_id: string | null
          escritorio_id: string
          forma_cobranca: string | null
          formas_pagamento: Json | null
          grupo_clientes: Json | null
          horas_faturaveis: boolean | null
          id: string
          indice_reajuste: string | null
          numero_contrato: string
          reajuste_ativo: boolean | null
          tipo_contrato: string
          titulo: string | null
          updated_at: string | null
          valor_atualizado: number | null
          valor_total: number | null
          valores_cargo: Json | null
        }
        Insert: {
          ativo?: boolean | null
          atos?: Json | null
          clausulas?: string | null
          cliente_id: string
          config?: Json | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          data_ultimo_reajuste?: string | null
          descricao?: string | null
          escritorio_cobranca_id?: string | null
          escritorio_id: string
          forma_cobranca?: string | null
          formas_pagamento?: Json | null
          grupo_clientes?: Json | null
          horas_faturaveis?: boolean | null
          id?: string
          indice_reajuste?: string | null
          numero_contrato: string
          reajuste_ativo?: boolean | null
          tipo_contrato: string
          titulo?: string | null
          updated_at?: string | null
          valor_atualizado?: number | null
          valor_total?: number | null
          valores_cargo?: Json | null
        }
        Update: {
          ativo?: boolean | null
          atos?: Json | null
          clausulas?: string | null
          cliente_id?: string
          config?: Json | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_ultimo_reajuste?: string | null
          descricao?: string | null
          escritorio_cobranca_id?: string | null
          escritorio_id?: string
          forma_cobranca?: string | null
          formas_pagamento?: Json | null
          grupo_clientes?: Json | null
          horas_faturaveis?: boolean | null
          id?: string
          indice_reajuste?: string | null
          numero_contrato?: string
          reajuste_ativo?: boolean | null
          tipo_contrato?: string
          titulo?: string | null
          updated_at?: string | null
          valor_atualizado?: number | null
          valor_total?: number | null
          valores_cargo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_honorarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_honorarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_honorarios_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contratos_honorarios_escritorio_cobranca_id_fkey"
            columns: ["escritorio_cobranca_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_despesas: {
        Row: {
          advogado_id: string | null
          categoria: Database["public"]["Enums"]["despesa_categoria_enum"]
          cliente_id: string | null
          comprovante_url: string | null
          config_recorrencia: Json | null
          consulta_id: string | null
          consultivo_id: string | null
          conta_bancaria_id: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          despesa_pai_id: string | null
          documento_fiscal: string | null
          escritorio_id: string
          fatura_id: string | null
          faturado: boolean | null
          forma_pagamento:
            | Database["public"]["Enums"]["forma_pagamento_enum"]
            | null
          fornecedor: string | null
          honorario_reembolso_id: string | null
          id: string
          numero_parcela: number | null
          numero_parcelas: number | null
          parcelado: boolean | null
          processo_id: string | null
          recorrente: boolean | null
          reembolsado: boolean | null
          reembolsavel: boolean | null
          reembolso_fatura_id: string | null
          reembolso_status: string | null
          status: Database["public"]["Enums"]["despesa_status_enum"]
          updated_at: string | null
          valor: number
        }
        Insert: {
          advogado_id?: string | null
          categoria: Database["public"]["Enums"]["despesa_categoria_enum"]
          cliente_id?: string | null
          comprovante_url?: string | null
          config_recorrencia?: Json | null
          consulta_id?: string | null
          consultivo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          despesa_pai_id?: string | null
          documento_fiscal?: string | null
          escritorio_id: string
          fatura_id?: string | null
          faturado?: boolean | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento_enum"]
            | null
          fornecedor?: string | null
          honorario_reembolso_id?: string | null
          id?: string
          numero_parcela?: number | null
          numero_parcelas?: number | null
          parcelado?: boolean | null
          processo_id?: string | null
          recorrente?: boolean | null
          reembolsado?: boolean | null
          reembolsavel?: boolean | null
          reembolso_fatura_id?: string | null
          reembolso_status?: string | null
          status?: Database["public"]["Enums"]["despesa_status_enum"]
          updated_at?: string | null
          valor: number
        }
        Update: {
          advogado_id?: string | null
          categoria?: Database["public"]["Enums"]["despesa_categoria_enum"]
          cliente_id?: string | null
          comprovante_url?: string | null
          config_recorrencia?: Json | null
          consulta_id?: string | null
          consultivo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          despesa_pai_id?: string | null
          documento_fiscal?: string | null
          escritorio_id?: string
          fatura_id?: string | null
          faturado?: boolean | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento_enum"]
            | null
          fornecedor?: string | null
          honorario_reembolso_id?: string | null
          id?: string
          numero_parcela?: number | null
          numero_parcelas?: number | null
          parcelado?: boolean | null
          processo_id?: string | null
          recorrente?: boolean | null
          reembolsado?: boolean | null
          reembolsavel?: boolean | null
          reembolso_fatura_id?: string | null
          reembolso_status?: string | null
          status?: Database["public"]["Enums"]["despesa_status_enum"]
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "financeiro_despesas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_despesas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_despesas_despesa_pai_id_fkey"
            columns: ["despesa_pai_id"]
            isOneToOne: false
            referencedRelation: "financeiro_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_despesa_pai_id_fkey"
            columns: ["despesa_pai_id"]
            isOneToOne: false
            referencedRelation: "v_despesas_reembolsaveis_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturamento_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "v_faturas_geradas"
            referencedColumns: ["fatura_id"]
          },
          {
            foreignKeyName: "financeiro_despesas_honorario_reembolso_id_fkey"
            columns: ["honorario_reembolso_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_honorario_reembolso_id_fkey"
            columns: ["honorario_reembolso_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_despesas_reembolso_fatura_id_fkey"
            columns: ["reembolso_fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturamento_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_reembolso_fatura_id_fkey"
            columns: ["reembolso_fatura_id"]
            isOneToOne: false
            referencedRelation: "v_faturas_geradas"
            referencedColumns: ["fatura_id"]
          },
          {
            foreignKeyName: "fk_despesas_conta_bancaria"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_despesas_conta_bancaria"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_contas_bancarias_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_despesas_conta_bancaria"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_extrato_bancario: {
        Row: {
          categoria: string | null
          comprovante_url: string | null
          conciliado: boolean | null
          conciliado_em: string | null
          conta_bancaria_id: string
          created_at: string | null
          data_lancamento: string
          descricao: string
          escritorio_id: string
          id: string
          observacoes: string | null
          origem_id: string | null
          origem_tipo: string
          saldo_apos_lancamento: number
          tipo: string
          transferencia_id: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          comprovante_url?: string | null
          conciliado?: boolean | null
          conciliado_em?: string | null
          conta_bancaria_id: string
          created_at?: string | null
          data_lancamento?: string
          descricao: string
          escritorio_id: string
          id?: string
          observacoes?: string | null
          origem_id?: string | null
          origem_tipo: string
          saldo_apos_lancamento: number
          tipo: string
          transferencia_id?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          comprovante_url?: string | null
          conciliado?: boolean | null
          conciliado_em?: string | null
          conta_bancaria_id?: string
          created_at?: string | null
          data_lancamento?: string
          descricao?: string
          escritorio_id?: string
          id?: string
          observacoes?: string | null
          origem_id?: string | null
          origem_tipo?: string
          saldo_apos_lancamento?: number
          tipo?: string
          transferencia_id?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "conta_bancaria_lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_bancaria_lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_contas_bancarias_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_bancaria_lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_lancamentos_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "financeiro_extrato_bancario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financeiro_contas_lancamentos_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_faturamento_faturas: {
        Row: {
          cancelada_em: string | null
          cancelada_por: string | null
          cliente_id: string
          cobrancas: Json | null
          config_agendamento: Json | null
          created_at: string | null
          data_emissao: string
          data_vencimento: string
          descricao: string | null
          enviada_em: string | null
          escritorio_cobranca_id: string | null
          escritorio_id: string
          forma_pagamento_preferencial: string | null
          gerada_automaticamente: boolean | null
          id: string
          itens: Json | null
          motivo_cancelamento: string | null
          numero_fatura: string
          numero_parcelas: number | null
          observacoes: string | null
          paga_em: string | null
          parcelado: boolean | null
          pdf_url: string | null
          status: string
          updated_at: string | null
          valor_total: number
        }
        Insert: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_id: string
          cobrancas?: Json | null
          config_agendamento?: Json | null
          created_at?: string | null
          data_emissao?: string
          data_vencimento: string
          descricao?: string | null
          enviada_em?: string | null
          escritorio_cobranca_id?: string | null
          escritorio_id: string
          forma_pagamento_preferencial?: string | null
          gerada_automaticamente?: boolean | null
          id?: string
          itens?: Json | null
          motivo_cancelamento?: string | null
          numero_fatura: string
          numero_parcelas?: number | null
          observacoes?: string | null
          paga_em?: string | null
          parcelado?: boolean | null
          pdf_url?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number
        }
        Update: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_id?: string
          cobrancas?: Json | null
          config_agendamento?: Json | null
          created_at?: string | null
          data_emissao?: string
          data_vencimento?: string
          descricao?: string | null
          enviada_em?: string | null
          escritorio_cobranca_id?: string | null
          escritorio_id?: string
          forma_pagamento_preferencial?: string | null
          gerada_automaticamente?: boolean | null
          id?: string
          itens?: Json | null
          motivo_cancelamento?: string | null
          numero_fatura?: string
          numero_parcelas?: number | null
          observacoes?: string | null
          paga_em?: string | null
          parcelado?: boolean | null
          pdf_url?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cancelada_por_fkey"
            columns: ["cancelada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_cancelada_por_fkey"
            columns: ["cancelada_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_faturamento_faturas_escritorio_cobranca_id_fkey"
            columns: ["escritorio_cobranca_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_fechamentos_pasta: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cliente_id: string
          competencia: string
          contrato_id: string
          created_at: string | null
          escritorio_id: string
          fatura_id: string | null
          faturado_em: string | null
          id: string
          processos: Json
          qtd_processos: number
          status: string
          updated_at: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente_id: string
          competencia: string
          contrato_id: string
          created_at?: string | null
          escritorio_id: string
          fatura_id?: string | null
          faturado_em?: string | null
          id?: string
          processos?: Json
          qtd_processos?: number
          status?: string
          updated_at?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente_id?: string
          competencia?: string
          contrato_id?: string
          created_at?: string | null
          escritorio_id?: string
          fatura_id?: string | null
          faturado_em?: string | null
          id?: string
          processos?: Json
          qtd_processos?: number
          status?: string
          updated_at?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_fechamentos_pasta_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturamento_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fechamentos_pasta_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "v_faturas_geradas"
            referencedColumns: ["fatura_id"]
          },
        ]
      }
      financeiro_horas_acumuladas_ato: {
        Row: {
          ato_tipo_id: string
          contrato_id: string
          created_at: string | null
          escritorio_id: string
          finalizado_em: string | null
          horas_excedentes: number
          horas_faturaveis: number
          horas_totais: number
          id: string
          processo_id: string
          receita_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ato_tipo_id: string
          contrato_id: string
          created_at?: string | null
          escritorio_id: string
          finalizado_em?: string | null
          horas_excedentes?: number
          horas_faturaveis?: number
          horas_totais?: number
          id?: string
          processo_id: string
          receita_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          ato_tipo_id?: string
          contrato_id?: string
          created_at?: string | null
          escritorio_id?: string
          finalizado_em?: string | null
          horas_excedentes?: number
          horas_faturaveis?: number
          horas_totais?: number
          id?: string
          processo_id?: string
          receita_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_ato_tipo_id_fkey"
            columns: ["ato_tipo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_atos_processuais_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_mapeamento_atos_movimentacao: {
        Row: {
          ativo: boolean | null
          ato_tipo_id: string
          created_at: string | null
          escritorio_id: string
          id: string
          palavras_chave: string[]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          ato_tipo_id: string
          created_at?: string | null
          escritorio_id: string
          id?: string
          palavras_chave?: string[]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          ato_tipo_id?: string
          created_at?: string | null
          escritorio_id?: string
          id?: string
          palavras_chave?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_mapeamento_atos_movimentacao_ato_tipo_id_fkey"
            columns: ["ato_tipo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_atos_processuais_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_mapeamento_atos_movimentacao_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_metas: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string
          escritorio_id: string
          id: string
          percentual_atingido: number | null
          tipo_meta: string
          updated_at: string | null
          valor_meta: number
          valor_realizado: number | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao: string
          escritorio_id: string
          id?: string
          percentual_atingido?: number | null
          tipo_meta: string
          updated_at?: string | null
          valor_meta: number
          valor_realizado?: number | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string
          escritorio_id?: string
          id?: string
          percentual_atingido?: number | null
          tipo_meta?: string
          updated_at?: string | null
          valor_meta?: number
          valor_realizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_financeiras_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_provisoes: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          data_inicio: string
          data_prevista_pagamento: string | null
          descricao: string
          escritorio_id: string
          id: string
          tipo: string
          updated_at: string | null
          valor_acumulado: number | null
          valor_mensal: number
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          data_inicio: string
          data_prevista_pagamento?: string | null
          descricao: string
          escritorio_id: string
          id?: string
          tipo: string
          updated_at?: string | null
          valor_acumulado?: number | null
          valor_mensal: number
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          data_inicio?: string
          data_prevista_pagamento?: string | null
          descricao?: string
          escritorio_id?: string
          id?: string
          tipo?: string
          updated_at?: string | null
          valor_acumulado?: number | null
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "provisoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_receitas: {
        Row: {
          categoria: Database["public"]["Enums"]["receita_categoria_enum"]
          cliente_id: string | null
          config_recorrencia: Json | null
          consulta_id: string | null
          consultivo_id: string | null
          conta_bancaria_id: string | null
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          data_competencia: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          dias_atraso: number | null
          escritorio_id: string
          fatura_id: string | null
          forma_pagamento:
            | Database["public"]["Enums"]["forma_pagamento_enum"]
            | null
          id: string
          juros_aplicados: number | null
          numero_parcela: number | null
          numero_parcelas: number | null
          observacoes: string | null
          parcelado: boolean | null
          processo_id: string | null
          receita_origem_id: string | null
          receita_pai_id: string | null
          recorrente: boolean | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["receita_status_enum"]
          tipo: Database["public"]["Enums"]["receita_tipo_enum"]
          updated_at: string | null
          updated_by: string | null
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["receita_categoria_enum"]
          cliente_id?: string | null
          config_recorrencia?: Json | null
          consulta_id?: string | null
          consultivo_id?: string | null
          conta_bancaria_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_competencia: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          dias_atraso?: number | null
          escritorio_id: string
          fatura_id?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento_enum"]
            | null
          id?: string
          juros_aplicados?: number | null
          numero_parcela?: number | null
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelado?: boolean | null
          processo_id?: string | null
          receita_origem_id?: string | null
          receita_pai_id?: string | null
          recorrente?: boolean | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["receita_status_enum"]
          tipo: Database["public"]["Enums"]["receita_tipo_enum"]
          updated_at?: string | null
          updated_by?: string | null
          valor: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["receita_categoria_enum"]
          cliente_id?: string | null
          config_recorrencia?: Json | null
          consulta_id?: string | null
          consultivo_id?: string | null
          conta_bancaria_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_competencia?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          dias_atraso?: number | null
          escritorio_id?: string
          fatura_id?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento_enum"]
            | null
          id?: string
          juros_aplicados?: number | null
          numero_parcela?: number | null
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelado?: boolean | null
          processo_id?: string | null
          receita_origem_id?: string | null
          receita_pai_id?: string | null
          recorrente?: boolean | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["receita_status_enum"]
          tipo?: Database["public"]["Enums"]["receita_tipo_enum"]
          updated_at?: string | null
          updated_by?: string | null
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_receitas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_receitas_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_contas_bancarias_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "financeiro_receitas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturamento_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "v_faturas_geradas"
            referencedColumns: ["fatura_id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_receitas_receita_origem_id_fkey"
            columns: ["receita_origem_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_receita_origem_id_fkey"
            columns: ["receita_origem_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_receita_pai_id_fkey"
            columns: ["receita_pai_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_receita_pai_id_fkey"
            columns: ["receita_pai_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financeiro_receitas_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financeiro_receitas_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_financeiro_receitas_responsavel_id"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financeiro_receitas_responsavel_id"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_financeiro_receitas_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financeiro_receitas_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financeiro_reconciliacao: {
        Row: {
          conciliado_em: string | null
          conciliado_por: string | null
          conta_bancaria_id: string
          created_at: string | null
          diferenca: number | null
          escritorio_id: string
          id: string
          importacoes: Json | null
          mes_referencia: string
          observacoes: string | null
          saldo_calculado: number | null
          saldo_final_banco: number | null
          saldo_inicial_banco: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_bancaria_id: string
          created_at?: string | null
          diferenca?: number | null
          escritorio_id: string
          id?: string
          importacoes?: Json | null
          mes_referencia: string
          observacoes?: string | null
          saldo_calculado?: number | null
          saldo_final_banco?: number | null
          saldo_inicial_banco?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_bancaria_id?: string
          created_at?: string | null
          diferenca?: number | null
          escritorio_id?: string
          id?: string
          importacoes?: Json | null
          mes_referencia?: string
          observacoes?: string | null
          saldo_calculado?: number | null
          saldo_final_banco?: number | null
          saldo_inicial_banco?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_reconciliacao_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_contas_bancarias_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_reconciliacao_itens: {
        Row: {
          checknum: string | null
          created_at: string | null
          data_transacao: string
          descricao_banco: string
          despesa_id: string | null
          fitid: string | null
          hash_transacao: string | null
          id: string
          memo: string | null
          observacoes: string | null
          receita_id: string | null
          reconciliacao_id: string
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          checknum?: string | null
          created_at?: string | null
          data_transacao: string
          descricao_banco: string
          despesa_id?: string | null
          fitid?: string | null
          hash_transacao?: string | null
          id?: string
          memo?: string | null
          observacoes?: string | null
          receita_id?: string | null
          reconciliacao_id: string
          status?: string
          tipo: string
          valor: number
        }
        Update: {
          checknum?: string | null
          created_at?: string | null
          data_transacao?: string
          descricao_banco?: string
          despesa_id?: string | null
          fitid?: string | null
          hash_transacao?: string | null
          id?: string
          memo?: string | null
          observacoes?: string | null
          receita_id?: string | null
          reconciliacao_id?: string
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_reconciliacao_itens_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "financeiro_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_itens_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "v_despesas_reembolsaveis_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_reconciliacao_itens_reconciliacao_id_fkey"
            columns: ["reconciliacao_id"]
            isOneToOne: false
            referencedRelation: "financeiro_reconciliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_timesheet: {
        Row: {
          aprovado: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          atividade: string
          ato_tipo_id: string | null
          audiencia_id: string | null
          consulta_id: string | null
          consultivo_id: string | null
          created_at: string | null
          data_trabalho: string
          editado: boolean | null
          editado_em: string | null
          editado_por: string | null
          escritorio_id: string
          evento_id: string | null
          fatura_id: string | null
          faturado: boolean | null
          faturado_em: string | null
          faturavel: boolean | null
          faturavel_auto: boolean | null
          faturavel_manual: boolean | null
          hora_fim: string | null
          hora_inicio: string | null
          horas: number
          id: string
          justificativa_reprovacao: string | null
          origem: string | null
          processo_id: string | null
          reprovado: boolean | null
          reprovado_em: string | null
          reprovado_por: string | null
          tarefa_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aprovado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          atividade: string
          ato_tipo_id?: string | null
          audiencia_id?: string | null
          consulta_id?: string | null
          consultivo_id?: string | null
          created_at?: string | null
          data_trabalho: string
          editado?: boolean | null
          editado_em?: string | null
          editado_por?: string | null
          escritorio_id: string
          evento_id?: string | null
          fatura_id?: string | null
          faturado?: boolean | null
          faturado_em?: string | null
          faturavel?: boolean | null
          faturavel_auto?: boolean | null
          faturavel_manual?: boolean | null
          hora_fim?: string | null
          hora_inicio?: string | null
          horas: number
          id?: string
          justificativa_reprovacao?: string | null
          origem?: string | null
          processo_id?: string | null
          reprovado?: boolean | null
          reprovado_em?: string | null
          reprovado_por?: string | null
          tarefa_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aprovado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          atividade?: string
          ato_tipo_id?: string | null
          audiencia_id?: string | null
          consulta_id?: string | null
          consultivo_id?: string | null
          created_at?: string | null
          data_trabalho?: string
          editado?: boolean | null
          editado_em?: string | null
          editado_por?: string | null
          escritorio_id?: string
          evento_id?: string | null
          fatura_id?: string | null
          faturado?: boolean | null
          faturado_em?: string | null
          faturavel?: boolean | null
          faturavel_auto?: boolean | null
          faturavel_manual?: boolean | null
          hora_fim?: string | null
          hora_inicio?: string | null
          horas?: number
          id?: string
          justificativa_reprovacao?: string | null
          origem?: string | null
          processo_id?: string | null
          reprovado?: boolean | null
          reprovado_em?: string | null
          reprovado_por?: string | null
          tarefa_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_timesheet_ato_tipo_id_fkey"
            columns: ["ato_tipo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_atos_processuais_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_audiencia_id_fkey"
            columns: ["audiencia_id"]
            isOneToOne: false
            referencedRelation: "agenda_audiencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consultivo_id_fkey"
            columns: ["consultivo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "agenda_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_timesheet_fatura"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturamento_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_timesheet_fatura"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "v_faturas_geradas"
            referencedColumns: ["fatura_id"]
          },
          {
            foreignKeyName: "timesheet_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reprovado_por_fkey"
            columns: ["reprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reprovado_por_fkey"
            columns: ["reprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financeiro_transferencias: {
        Row: {
          conta_destino_id: string
          conta_origem_id: string
          created_at: string | null
          created_by: string | null
          data_transferencia: string
          descricao: string | null
          escritorio_id: string
          id: string
          valor: number
        }
        Insert: {
          conta_destino_id: string
          conta_origem_id: string
          created_at?: string | null
          created_by?: string | null
          data_transferencia?: string
          descricao?: string | null
          escritorio_id: string
          id?: string
          valor: number
        }
        Update: {
          conta_destino_id?: string
          conta_origem_id?: string
          created_at?: string | null
          created_by?: string | null
          data_transferencia?: string
          descricao?: string | null
          escritorio_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_transferencias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "v_contas_bancarias_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "v_contas_bancarias_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      indices_economicos: {
        Row: {
          codigo_bcb: number
          competencia: string
          created_at: string | null
          escritorio_id: string | null
          fonte: string | null
          id: string
          nome: string
          updated_at: string | null
          valor: number
          variacao_mensal: number | null
        }
        Insert: {
          codigo_bcb: number
          competencia: string
          created_at?: string | null
          escritorio_id?: string | null
          fonte?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          valor: number
          variacao_mensal?: number | null
        }
        Update: {
          codigo_bcb?: number
          competencia?: string
          created_at?: string | null
          escritorio_id?: string | null
          fonte?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          valor?: number
          variacao_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indices_economicos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      indices_economicos_config: {
        Row: {
          ativo: boolean | null
          codigo_bcb: number
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_bcb: number
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo_bcb?: number
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      migracao_historico: {
        Row: {
          arquivo_nome: string
          detalhes: Json | null
          escritorio_id: string
          executado_em: string | null
          executado_por: string | null
          id: string
          job_id: string | null
          modulo: string
          total_duplicatas: number | null
          total_erros: number | null
          total_importados: number
        }
        Insert: {
          arquivo_nome: string
          detalhes?: Json | null
          escritorio_id: string
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          job_id?: string | null
          modulo: string
          total_duplicatas?: number | null
          total_erros?: number | null
          total_importados?: number
        }
        Update: {
          arquivo_nome?: string
          detalhes?: Json | null
          escritorio_id?: string
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          job_id?: string | null
          modulo?: string
          total_duplicatas?: number | null
          total_erros?: number | null
          total_importados?: number
        }
        Relationships: [
          {
            foreignKeyName: "migracao_historico_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migracao_historico_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migracao_historico_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "migracao_historico_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "migracao_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      migracao_jobs: {
        Row: {
          arquivo_nome: string
          arquivo_storage_path: string
          campos_extras: Json | null
          concluido_em: string | null
          config: Json | null
          correcoes_usuario: Json | null
          created_at: string | null
          criado_por: string | null
          decisoes_pendencias: Json | null
          duplicatas: Json | null
          erros: Json | null
          escritorio_id: string
          etapa_atual: string | null
          id: string
          iniciado_em: string | null
          linhas_com_erro: number | null
          linhas_duplicadas: number | null
          linhas_importadas: number | null
          linhas_processadas: number | null
          linhas_validas: number | null
          mapeamento: Json
          modulo: string
          pendencias: Json | null
          resultado_final: Json | null
          status: string
          total_linhas: number | null
          updated_at: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_storage_path: string
          campos_extras?: Json | null
          concluido_em?: string | null
          config?: Json | null
          correcoes_usuario?: Json | null
          created_at?: string | null
          criado_por?: string | null
          decisoes_pendencias?: Json | null
          duplicatas?: Json | null
          erros?: Json | null
          escritorio_id: string
          etapa_atual?: string | null
          id?: string
          iniciado_em?: string | null
          linhas_com_erro?: number | null
          linhas_duplicadas?: number | null
          linhas_importadas?: number | null
          linhas_processadas?: number | null
          linhas_validas?: number | null
          mapeamento?: Json
          modulo: string
          pendencias?: Json | null
          resultado_final?: Json | null
          status?: string
          total_linhas?: number | null
          updated_at?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_storage_path?: string
          campos_extras?: Json | null
          concluido_em?: string | null
          config?: Json | null
          correcoes_usuario?: Json | null
          created_at?: string | null
          criado_por?: string | null
          decisoes_pendencias?: Json | null
          duplicatas?: Json | null
          erros?: Json | null
          escritorio_id?: string
          etapa_atual?: string | null
          id?: string
          iniciado_em?: string | null
          linhas_com_erro?: number | null
          linhas_duplicadas?: number | null
          linhas_importadas?: number | null
          linhas_processadas?: number | null
          linhas_validas?: number | null
          mapeamento?: Json
          modulo?: string
          pendencias?: Json | null
          resultado_final?: Json | null
          status?: string
          total_linhas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migracao_jobs_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migracao_jobs_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "migracao_jobs_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      numeracao_modulos: {
        Row: {
          created_at: string | null
          escritorio_id: string
          id: string
          modulo: string
          prefixo: string
          ultimo_numero: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escritorio_id: string
          id?: string
          modulo: string
          prefixo: string
          ultimo_numero?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escritorio_id?: string
          id?: string
          modulo?: string
          prefixo?: string
          ultimo_numero?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "numeracao_modulos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      numeracao_sequencial: {
        Row: {
          created_at: string | null
          escritorio_id: string
          id: string
          ultimo_numero: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escritorio_id: string
          id?: string
          ultimo_numero?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escritorio_id?: string
          id?: string
          ultimo_numero?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "numeracao_sequencial_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: true
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          completada: boolean | null
          completada_em: string | null
          created_at: string | null
          dados_etapa: Json | null
          escritorio_id: string
          etapa: string
          id: string
          pulada: boolean | null
          pulada_em: string | null
          tempo_gasto_segundos: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completada?: boolean | null
          completada_em?: string | null
          created_at?: string | null
          dados_etapa?: Json | null
          escritorio_id: string
          etapa: string
          id?: string
          pulada?: boolean | null
          pulada_em?: string | null
          tempo_gasto_segundos?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completada?: boolean | null
          completada_em?: string | null
          created_at?: string | null
          dados_etapa?: Json | null
          escritorio_id?: string
          etapa?: string
          id?: string
          pulada?: boolean | null
          pulada_em?: string | null
          tempo_gasto_segundos?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pecas_jurisprudencias: {
        Row: {
          adicionado_por: string | null
          created_at: string | null
          data_julgamento: string | null
          data_publicacao: string | null
          ementa: string | null
          escritorio_id: string
          id: string
          link_consulta: string | null
          link_inteiro_teor: string | null
          numero_acordao: string | null
          numero_processo: string | null
          orgao_julgador: string | null
          relator: string | null
          tags: string[] | null
          temas: string[] | null
          texto_completo: string | null
          tipo: string
          tribunal: string
        }
        Insert: {
          adicionado_por?: string | null
          created_at?: string | null
          data_julgamento?: string | null
          data_publicacao?: string | null
          ementa?: string | null
          escritorio_id: string
          id?: string
          link_consulta?: string | null
          link_inteiro_teor?: string | null
          numero_acordao?: string | null
          numero_processo?: string | null
          orgao_julgador?: string | null
          relator?: string | null
          tags?: string[] | null
          temas?: string[] | null
          texto_completo?: string | null
          tipo: string
          tribunal: string
        }
        Update: {
          adicionado_por?: string | null
          created_at?: string | null
          data_julgamento?: string | null
          data_publicacao?: string | null
          ementa?: string | null
          escritorio_id?: string
          id?: string
          link_consulta?: string | null
          link_inteiro_teor?: string | null
          numero_acordao?: string | null
          numero_processo?: string | null
          orgao_julgador?: string | null
          relator?: string | null
          tags?: string[] | null
          temas?: string[] | null
          texto_completo?: string | null
          tipo?: string
          tribunal?: string
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_jurisprudencias_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_jurisprudencias_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_jurisprudencias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_pecas: {
        Row: {
          arquivo_url: string | null
          conteudo: string | null
          created_at: string | null
          criado_por: string | null
          data_protocolo: string | null
          escritorio_id: string
          id: string
          numero_protocolo: string | null
          processo_id: string | null
          status: string | null
          template_id: string | null
          tipo_peca: string
          titulo: string
          updated_at: string | null
          versao: number | null
          versao_anterior_id: string | null
        }
        Insert: {
          arquivo_url?: string | null
          conteudo?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_protocolo?: string | null
          escritorio_id: string
          id?: string
          numero_protocolo?: string | null
          processo_id?: string | null
          status?: string | null
          template_id?: string | null
          tipo_peca: string
          titulo: string
          updated_at?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Update: {
          arquivo_url?: string | null
          conteudo?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_protocolo?: string | null
          escritorio_id?: string
          id?: string
          numero_protocolo?: string | null
          processo_id?: string | null
          status?: string | null
          template_id?: string | null
          tipo_peca?: string
          titulo?: string
          updated_at?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_pecas_geradas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pecas_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_templates_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_templates_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_pecas_geradas_versao_anterior_id_fkey"
            columns: ["versao_anterior_id"]
            isOneToOne: false
            referencedRelation: "pecas_pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_relacoes: {
        Row: {
          created_at: string | null
          escritorio_id: string
          id: string
          jurisprudencia_id: string | null
          peca_id: string
          tese_id: string | null
          tipo_relacao: string
        }
        Insert: {
          created_at?: string | null
          escritorio_id: string
          id?: string
          jurisprudencia_id?: string | null
          peca_id: string
          tese_id?: string | null
          tipo_relacao: string
        }
        Update: {
          created_at?: string | null
          escritorio_id?: string
          id?: string
          jurisprudencia_id?: string | null
          peca_id?: string
          tese_id?: string | null
          tipo_relacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pecas_relacoes_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_relacoes_jurisprudencia_id_fkey"
            columns: ["jurisprudencia_id"]
            isOneToOne: false
            referencedRelation: "pecas_jurisprudencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_relacoes_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas_pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_relacoes_tese_id_fkey"
            columns: ["tese_id"]
            isOneToOne: false
            referencedRelation: "pecas_teses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_relacoes_tese_id_fkey"
            columns: ["tese_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_teses_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_templates: {
        Row: {
          area: string
          ativo: boolean | null
          categoria: string
          conteudo_template: string | null
          created_at: string | null
          criado_por: string | null
          escritorio_id: string
          estrutura: Json | null
          id: string
          nome: string
          tipo_processo: string | null
          updated_at: string | null
          uso_count: number | null
          variaveis: Json | null
        }
        Insert: {
          area: string
          ativo?: boolean | null
          categoria: string
          conteudo_template?: string | null
          created_at?: string | null
          criado_por?: string | null
          escritorio_id: string
          estrutura?: Json | null
          id?: string
          nome: string
          tipo_processo?: string | null
          updated_at?: string | null
          uso_count?: number | null
          variaveis?: Json | null
        }
        Update: {
          area?: string
          ativo?: boolean | null
          categoria?: string
          conteudo_template?: string | null
          created_at?: string | null
          criado_por?: string | null
          escritorio_id?: string
          estrutura?: Json | null
          id?: string
          nome?: string
          tipo_processo?: string | null
          updated_at?: string | null
          uso_count?: number | null
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_templates_jurisprudencias: {
        Row: {
          created_at: string | null
          escritorio_id: string
          id: string
          jurisprudencia_id: string
          ordem: number | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          escritorio_id: string
          id?: string
          jurisprudencia_id: string
          ordem?: number | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          escritorio_id?: string
          id?: string
          jurisprudencia_id?: string
          ordem?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pecas_templates_jurisprudencias_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_jurisprudencias_jurisprudencia_id_fkey"
            columns: ["jurisprudencia_id"]
            isOneToOne: false
            referencedRelation: "pecas_jurisprudencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_jurisprudencias_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pecas_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_jurisprudencias_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_templates_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_jurisprudencias_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_templates_completos"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_templates_teses: {
        Row: {
          created_at: string | null
          escritorio_id: string
          id: string
          ordem: number | null
          template_id: string
          tese_id: string
        }
        Insert: {
          created_at?: string | null
          escritorio_id: string
          id?: string
          ordem?: number | null
          template_id: string
          tese_id: string
        }
        Update: {
          created_at?: string | null
          escritorio_id?: string
          id?: string
          ordem?: number | null
          template_id?: string
          tese_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pecas_templates_teses_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_teses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pecas_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_teses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_templates_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_teses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_templates_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_teses_tese_id_fkey"
            columns: ["tese_id"]
            isOneToOne: false
            referencedRelation: "pecas_teses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_teses_tese_id_fkey"
            columns: ["tese_id"]
            isOneToOne: false
            referencedRelation: "v_pecas_teses_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_teses: {
        Row: {
          area: string
          ativa: boolean | null
          atualizado_por: string | null
          created_at: string | null
          criado_por: string | null
          escritorio_id: string
          fundamentacao: string | null
          id: string
          resumo: string | null
          subtema: string | null
          tags: string[] | null
          texto_completo: string | null
          titulo: string
          updated_at: string | null
          uso_count: number | null
        }
        Insert: {
          area: string
          ativa?: boolean | null
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          escritorio_id: string
          fundamentacao?: string | null
          id?: string
          resumo?: string | null
          subtema?: string | null
          tags?: string[] | null
          texto_completo?: string | null
          titulo: string
          updated_at?: string | null
          uso_count?: number | null
        }
        Update: {
          area?: string
          ativa?: boolean | null
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          escritorio_id?: string
          fundamentacao?: string | null
          id?: string
          resumo?: string | null
          subtema?: string | null
          tags?: string[] | null
          texto_completo?: string | null
          titulo?: string
          updated_at?: string | null
          uso_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_teses_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_metricas: {
        Row: {
          ano: number | null
          calculado_em: string
          duracao_maxima_dias: number | null
          duracao_media_dias: number | null
          duracao_minima_dias: number | null
          escritorio_id: string
          execucoes_canceladas: number | null
          execucoes_concluidas: number | null
          execucoes_em_andamento: number | null
          id: string
          mes: number | null
          periodo: string
          produto_id: string | null
          receita_media: number | null
          receita_total: number | null
          taxa_sucesso: number | null
          total_aprendizados: number | null
          total_execucoes: number | null
        }
        Insert: {
          ano?: number | null
          calculado_em?: string
          duracao_maxima_dias?: number | null
          duracao_media_dias?: number | null
          duracao_minima_dias?: number | null
          escritorio_id: string
          execucoes_canceladas?: number | null
          execucoes_concluidas?: number | null
          execucoes_em_andamento?: number | null
          id?: string
          mes?: number | null
          periodo: string
          produto_id?: string | null
          receita_media?: number | null
          receita_total?: number | null
          taxa_sucesso?: number | null
          total_aprendizados?: number | null
          total_execucoes?: number | null
        }
        Update: {
          ano?: number | null
          calculado_em?: string
          duracao_maxima_dias?: number | null
          duracao_media_dias?: number | null
          duracao_minima_dias?: number | null
          escritorio_id?: string
          execucoes_canceladas?: number | null
          execucoes_concluidas?: number | null
          execucoes_em_andamento?: number | null
          id?: string
          mes?: number | null
          periodo?: string
          produto_id?: string | null
          receita_media?: number | null
          receita_total?: number | null
          taxa_sucesso?: number | null
          total_aprendizados?: number | null
          total_execucoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_metricas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_metricas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_metricas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos: {
        Row: {
          area_juridica: string
          categoria: string | null
          codigo: string
          complexidade: string | null
          cor: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          descricao_comercial: string | null
          duracao_estimada_dias: number | null
          escritorio_id: string
          icone: string | null
          id: string
          imagem_url: string | null
          nome: string
          status: string
          tags: string[] | null
          updated_at: string
          versao_atual: number | null
          visivel_catalogo: boolean | null
        }
        Insert: {
          area_juridica: string
          categoria?: string | null
          codigo: string
          complexidade?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          descricao_comercial?: string | null
          duracao_estimada_dias?: number | null
          escritorio_id: string
          icone?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          versao_atual?: number | null
          visivel_catalogo?: boolean | null
        }
        Update: {
          area_juridica?: string
          categoria?: string | null
          codigo?: string
          complexidade?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          descricao_comercial?: string | null
          duracao_estimada_dias?: number | null
          escritorio_id?: string
          icone?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          versao_atual?: number | null
          visivel_catalogo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_produtos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos_checklist: {
        Row: {
          created_at: string
          criar_tarefa: boolean | null
          fase_id: string
          id: string
          item: string
          obrigatorio: boolean | null
          ordem: number
          tarefa_prazo_dias: number | null
        }
        Insert: {
          created_at?: string
          criar_tarefa?: boolean | null
          fase_id: string
          id?: string
          item: string
          obrigatorio?: boolean | null
          ordem: number
          tarefa_prazo_dias?: number | null
        }
        Update: {
          created_at?: string
          criar_tarefa?: boolean | null
          fase_id?: string
          id?: string
          item?: string
          obrigatorio?: boolean | null
          ordem?: number
          tarefa_prazo_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_checklist_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_fases"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos_equipe_papeis: {
        Row: {
          created_at: string
          descricao: string | null
          habilidades_requeridas: string[] | null
          id: string
          nome: string
          obrigatorio: boolean | null
          produto_id: string
          quantidade_minima: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          habilidades_requeridas?: string[] | null
          id?: string
          nome: string
          obrigatorio?: boolean | null
          produto_id: string
          quantidade_minima?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          habilidades_requeridas?: string[] | null
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          produto_id?: string
          quantidade_minima?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_equipe_papeis_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_equipe_papeis_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos_fases: {
        Row: {
          cor: string | null
          created_at: string
          criar_evento_agenda: boolean | null
          descricao: string | null
          duracao_estimada_dias: number | null
          evento_descricao_template: string | null
          evento_titulo_template: string | null
          fase_dependencia_id: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          prazo_tipo: string | null
          produto_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          criar_evento_agenda?: boolean | null
          descricao?: string | null
          duracao_estimada_dias?: number | null
          evento_descricao_template?: string | null
          evento_titulo_template?: string | null
          fase_dependencia_id?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem: number
          prazo_tipo?: string | null
          produto_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          criar_evento_agenda?: boolean | null
          descricao?: string | null
          duracao_estimada_dias?: number | null
          evento_descricao_template?: string | null
          evento_titulo_template?: string | null
          fase_dependencia_id?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          prazo_tipo?: string | null
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_fases_fase_dependencia_id_fkey"
            columns: ["fase_dependencia_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_fases_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_fases_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos_precos: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          horas_estimadas: number | null
          id: string
          nome_opcao: string | null
          padrao: boolean | null
          percentual_exito: number | null
          produto_id: string
          tipo: string
          valor_fixo: number | null
          valor_hora: number | null
          valor_maximo: number | null
          valor_minimo: number | null
          valores_por_fase: Json | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          horas_estimadas?: number | null
          id?: string
          nome_opcao?: string | null
          padrao?: boolean | null
          percentual_exito?: number | null
          produto_id: string
          tipo: string
          valor_fixo?: number | null
          valor_hora?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
          valores_por_fase?: Json | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          horas_estimadas?: number | null
          id?: string
          nome_opcao?: string | null
          padrao?: boolean | null
          percentual_exito?: number | null
          produto_id?: string
          tipo?: string
          valor_fixo?: number | null
          valor_hora?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
          valores_por_fase?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos_recursos: {
        Row: {
          arquivo_nome: string | null
          arquivo_tipo: string | null
          arquivo_url: string | null
          created_at: string
          descricao: string | null
          fase_id: string | null
          id: string
          nome: string
          produto_id: string
          tipo: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          fase_id?: string | null
          id?: string
          nome: string
          produto_id: string
          tipo: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          fase_id?: string | null
          id?: string
          nome?: string
          produto_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_recursos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_recursos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_recursos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_produtos_versoes: {
        Row: {
          alteracoes: string | null
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          produto_id: string
          snapshot: Json
          versao: number
        }
        Insert: {
          alteracoes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          produto_id: string
          snapshot: Json
          versao: number
        }
        Update: {
          alteracoes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string
          snapshot?: Json
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_versoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_versoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_produtos_versoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_produtos_versoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projetos: {
        Row: {
          cliente_id: string
          codigo: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_prevista_conclusao: string | null
          escritorio_id: string
          id: string
          nome: string
          observacoes: string | null
          observacoes_resultado: string | null
          preco_selecionado_id: string | null
          processo_id: string | null
          produto_id: string
          produto_versao: number
          progresso_percentual: number | null
          responsavel_id: string
          resultado: string | null
          status: string
          tags: string[] | null
          updated_at: string
          valor_negociado: number | null
        }
        Insert: {
          cliente_id: string
          codigo: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          escritorio_id: string
          id?: string
          nome: string
          observacoes?: string | null
          observacoes_resultado?: string | null
          preco_selecionado_id?: string | null
          processo_id?: string | null
          produto_id: string
          produto_versao: number
          progresso_percentual?: number | null
          responsavel_id: string
          resultado?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          valor_negociado?: number | null
        }
        Update: {
          cliente_id?: string
          codigo?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          escritorio_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          observacoes_resultado?: string | null
          preco_selecionado_id?: string | null
          processo_id?: string | null
          produto_id?: string
          produto_versao?: number
          progresso_percentual?: number | null
          responsavel_id?: string
          resultado?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          valor_negociado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_projetos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_preco_selecionado_id_fkey"
            columns: ["preco_selecionado_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolio_projetos_aprendizados: {
        Row: {
          aplicado_ao_produto: boolean | null
          aplicado_em: string | null
          aplicar_ao_produto: boolean | null
          categoria: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          fase_projeto_id: string | null
          id: string
          impacto: string | null
          projeto_id: string
          tags: string[] | null
          tipo: string
          titulo: string
        }
        Insert: {
          aplicado_ao_produto?: boolean | null
          aplicado_em?: string | null
          aplicar_ao_produto?: boolean | null
          categoria?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          fase_projeto_id?: string | null
          id?: string
          impacto?: string | null
          projeto_id: string
          tags?: string[] | null
          tipo: string
          titulo: string
        }
        Update: {
          aplicado_ao_produto?: boolean | null
          aplicado_em?: string | null
          aplicar_ao_produto?: boolean | null
          categoria?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          fase_projeto_id?: string | null
          id?: string
          impacto?: string | null
          projeto_id?: string
          tags?: string[] | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projetos_aprendizados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_aprendizados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_projetos_aprendizados_fase_projeto_id_fkey"
            columns: ["fase_projeto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projetos_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_aprendizados_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_aprendizados_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_projetos_completos"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projetos_equipe: {
        Row: {
          created_at: string
          id: string
          papel_id: string | null
          papel_nome: string
          pode_editar: boolean | null
          projeto_id: string
          recebe_notificacoes: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          papel_id?: string | null
          papel_nome: string
          pode_editar?: boolean | null
          projeto_id: string
          recebe_notificacoes?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          papel_id?: string | null
          papel_nome?: string
          pode_editar?: boolean | null
          projeto_id?: string
          recebe_notificacoes?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projetos_equipe_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_equipe_papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_equipe_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_equipe_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_projetos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_equipe_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_equipe_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolio_projetos_fases: {
        Row: {
          created_at: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          descricao: string | null
          evento_agenda_id: string | null
          fase_produto_id: string | null
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          progresso_percentual: number | null
          projeto_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          evento_agenda_id?: string | null
          fase_produto_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          ordem: number
          progresso_percentual?: number | null
          projeto_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          evento_agenda_id?: string | null
          fase_produto_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          progresso_percentual?: number | null
          projeto_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projetos_fases_fase_produto_id_fkey"
            columns: ["fase_produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_fases_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_fases_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_projetos_completos"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projetos_fases_checklist: {
        Row: {
          checklist_produto_id: string | null
          concluido: boolean | null
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          fase_projeto_id: string
          id: string
          item: string
          obrigatorio: boolean | null
          ordem: number
          tarefa_id: string | null
        }
        Insert: {
          checklist_produto_id?: string | null
          concluido?: boolean | null
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          fase_projeto_id: string
          id?: string
          item: string
          obrigatorio?: boolean | null
          ordem: number
          tarefa_id?: string | null
        }
        Update: {
          checklist_produto_id?: string | null
          concluido?: boolean | null
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          fase_projeto_id?: string
          id?: string
          item?: string
          obrigatorio?: boolean | null
          ordem?: number
          tarefa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projetos_fases_checklist_checklist_produto_id_fkey"
            columns: ["checklist_produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_fases_checklist_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_fases_checklist_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_projetos_fases_checklist_fase_projeto_id_fkey"
            columns: ["fase_projeto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projetos_fases"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_depositos: {
        Row: {
          agencia: string | null
          banco: string | null
          conta: string | null
          created_at: string | null
          created_by: string | null
          data_deposito: string
          data_levantamento: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          numero_guia: string | null
          observacoes: string | null
          processo_id: string
          status: string
          tipo: string
          updated_at: string | null
          valor: number
          valor_levantado: number | null
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          conta?: string | null
          created_at?: string | null
          created_by?: string | null
          data_deposito: string
          data_levantamento?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          numero_guia?: string | null
          observacoes?: string | null
          processo_id: string
          status?: string
          tipo: string
          updated_at?: string | null
          valor: number
          valor_levantado?: number | null
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          conta?: string | null
          created_at?: string | null
          created_by?: string | null
          data_deposito?: string
          data_levantamento?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          numero_guia?: string | null
          observacoes?: string | null
          processo_id?: string
          status?: string
          tipo?: string
          updated_at?: string | null
          valor?: number
          valor_levantado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_depositos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      processos_equipe: {
        Row: {
          adicionado_em: string | null
          adicionado_por: string | null
          escritorio_id: string
          id: string
          papel: string
          pode_editar: boolean | null
          pode_visualizar: boolean | null
          processo_id: string
          recebe_notificacoes: boolean | null
          user_id: string
        }
        Insert: {
          adicionado_em?: string | null
          adicionado_por?: string | null
          escritorio_id: string
          id?: string
          papel: string
          pode_editar?: boolean | null
          pode_visualizar?: boolean | null
          processo_id: string
          recebe_notificacoes?: boolean | null
          user_id: string
        }
        Update: {
          adicionado_em?: string | null
          adicionado_por?: string | null
          escritorio_id?: string
          id?: string
          papel?: string
          pode_editar?: boolean | null
          pode_visualizar?: boolean | null
          processo_id?: string
          recebe_notificacoes?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_equipe_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_equipe_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_equipe_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_equipe_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_equipe_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_equipe_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_equipe_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "processos_equipe_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_equipe_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      processos_estrategia: {
        Row: {
          ameacas: Json | null
          aprovado: boolean | null
          created_at: string | null
          data_aprovacao: string | null
          data_revisao: string | null
          documentos_necessarios: Json | null
          elaborado_por: string | null
          escritorio_id: string
          estrategia_texto: string | null
          fundamentos_legais: string[] | null
          id: string
          is_versao_atual: boolean | null
          objetivo_principal: string | null
          oportunidades: Json | null
          parametros_acordo: Json | null
          plano_contingencia: string | null
          pontos_fortes: Json | null
          pontos_fracos: Json | null
          possibilidade_acordo: boolean | null
          processo_id: string
          provas_a_produzir: Json | null
          proximos_passos: Json | null
          resumo_caso: string | null
          revisado_por: string | null
          riscos_identificados: Json | null
          teses_principais: string[] | null
          teses_subsidiarias: string[] | null
          updated_at: string | null
          versao: number | null
          versao_anterior_id: string | null
        }
        Insert: {
          ameacas?: Json | null
          aprovado?: boolean | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_revisao?: string | null
          documentos_necessarios?: Json | null
          elaborado_por?: string | null
          escritorio_id: string
          estrategia_texto?: string | null
          fundamentos_legais?: string[] | null
          id?: string
          is_versao_atual?: boolean | null
          objetivo_principal?: string | null
          oportunidades?: Json | null
          parametros_acordo?: Json | null
          plano_contingencia?: string | null
          pontos_fortes?: Json | null
          pontos_fracos?: Json | null
          possibilidade_acordo?: boolean | null
          processo_id: string
          provas_a_produzir?: Json | null
          proximos_passos?: Json | null
          resumo_caso?: string | null
          revisado_por?: string | null
          riscos_identificados?: Json | null
          teses_principais?: string[] | null
          teses_subsidiarias?: string[] | null
          updated_at?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Update: {
          ameacas?: Json | null
          aprovado?: boolean | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_revisao?: string | null
          documentos_necessarios?: Json | null
          elaborado_por?: string | null
          escritorio_id?: string
          estrategia_texto?: string | null
          fundamentos_legais?: string[] | null
          id?: string
          is_versao_atual?: boolean | null
          objetivo_principal?: string | null
          oportunidades?: Json | null
          parametros_acordo?: Json | null
          plano_contingencia?: string | null
          pontos_fortes?: Json | null
          pontos_fracos?: Json | null
          possibilidade_acordo?: boolean | null
          processo_id?: string
          provas_a_produzir?: Json | null
          proximos_passos?: Json | null
          resumo_caso?: string | null
          revisado_por?: string | null
          riscos_identificados?: Json | null
          teses_principais?: string[] | null
          teses_subsidiarias?: string[] | null
          updated_at?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_estrategia_elaborado_por_fkey"
            columns: ["elaborado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_estrategia_elaborado_por_fkey"
            columns: ["elaborado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_estrategia_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_estrategia_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_estrategia_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_estrategia_versao_anterior_id_fkey"
            columns: ["versao_anterior_id"]
            isOneToOne: false
            referencedRelation: "processos_estrategia"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_historico: {
        Row: {
          acao: string
          campo_alterado: string | null
          created_at: string | null
          descricao: string
          escritorio_id: string
          id: string
          processo_id: string
          user_id: string | null
          user_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          campo_alterado?: string | null
          created_at?: string | null
          descricao: string
          escritorio_id: string
          id?: string
          processo_id: string
          user_id?: string | null
          user_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          campo_alterado?: string | null
          created_at?: string | null
          descricao?: string
          escritorio_id?: string
          id?: string
          processo_id?: string
          user_id?: string | null
          user_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_processos_historico_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "processos_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      processos_jurisprudencias: {
        Row: {
          adicionado_por: string | null
          aplicada_em_peca: boolean | null
          citada_em_analise: boolean | null
          created_at: string | null
          data_julgamento: string | null
          data_publicacao: string | null
          decisao: string | null
          ementa: string
          escritorio_id: string
          fonte: string | null
          id: string
          link_consulta: string | null
          link_inteiro_teor: string | null
          metadata: Json | null
          numero_acordao: string | null
          numero_processo: string | null
          observacoes: string | null
          orgao_julgador: string | null
          peca_id: string | null
          processo_id: string
          relator: string | null
          relevancia: string | null
          resultado: string | null
          similaridade_score: number | null
          tags: string[] | null
          temas_relacionados: string[] | null
          teses_aplicadas: string[] | null
          texto_completo: string | null
          tipo: string | null
          tribunal: string
        }
        Insert: {
          adicionado_por?: string | null
          aplicada_em_peca?: boolean | null
          citada_em_analise?: boolean | null
          created_at?: string | null
          data_julgamento?: string | null
          data_publicacao?: string | null
          decisao?: string | null
          ementa: string
          escritorio_id: string
          fonte?: string | null
          id?: string
          link_consulta?: string | null
          link_inteiro_teor?: string | null
          metadata?: Json | null
          numero_acordao?: string | null
          numero_processo?: string | null
          observacoes?: string | null
          orgao_julgador?: string | null
          peca_id?: string | null
          processo_id: string
          relator?: string | null
          relevancia?: string | null
          resultado?: string | null
          similaridade_score?: number | null
          tags?: string[] | null
          temas_relacionados?: string[] | null
          teses_aplicadas?: string[] | null
          texto_completo?: string | null
          tipo?: string | null
          tribunal: string
        }
        Update: {
          adicionado_por?: string | null
          aplicada_em_peca?: boolean | null
          citada_em_analise?: boolean | null
          created_at?: string | null
          data_julgamento?: string | null
          data_publicacao?: string | null
          decisao?: string | null
          ementa?: string
          escritorio_id?: string
          fonte?: string | null
          id?: string
          link_consulta?: string | null
          link_inteiro_teor?: string | null
          metadata?: Json | null
          numero_acordao?: string | null
          numero_processo?: string | null
          observacoes?: string | null
          orgao_julgador?: string | null
          peca_id?: string | null
          processo_id?: string
          relator?: string | null
          relevancia?: string | null
          resultado?: string | null
          similaridade_score?: number | null
          tags?: string[] | null
          temas_relacionados?: string[] | null
          teses_aplicadas?: string[] | null
          texto_completo?: string | null
          tipo?: string | null
          tribunal?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_jurisprudencias_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_jurisprudencias_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_jurisprudencias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_movimentacoes: {
        Row: {
          comentarios: string | null
          conteudo_completo: string | null
          created_at: string | null
          data_movimento: string
          descricao: string
          escritorio_id: string
          id: string
          importante: boolean | null
          lida: boolean | null
          lida_em: string | null
          lida_por: string | null
          origem: string
          processo_id: string
          tipo_codigo: string | null
          tipo_descricao: string | null
        }
        Insert: {
          comentarios?: string | null
          conteudo_completo?: string | null
          created_at?: string | null
          data_movimento: string
          descricao: string
          escritorio_id: string
          id?: string
          importante?: boolean | null
          lida?: boolean | null
          lida_em?: string | null
          lida_por?: string | null
          origem?: string
          processo_id: string
          tipo_codigo?: string | null
          tipo_descricao?: string | null
        }
        Update: {
          comentarios?: string | null
          conteudo_completo?: string | null
          created_at?: string | null
          data_movimento?: string
          descricao?: string
          escritorio_id?: string
          id?: string
          importante?: boolean | null
          lida?: boolean | null
          lida_em?: string | null
          lida_por?: string | null
          origem?: string
          processo_id?: string
          tipo_codigo?: string | null
          tipo_descricao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_movimentacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_movimentacoes_lida_por_fkey"
            columns: ["lida_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_movimentacoes_lida_por_fkey"
            columns: ["lida_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      processos_processos: {
        Row: {
          area: Database["public"]["Enums"]["area_juridica_enum"]
          autor: string | null
          cliente_id: string
          colaboradores_ids: string[] | null
          comarca: string | null
          consultivo_origem_id: string | null
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          data_arquivamento: string | null
          data_distribuicao: string
          data_encerramento: string | null
          data_transito_julgado: string | null
          data_ultima_atualizacao_monetaria: string | null
          encerrado_em: string | null
          encerrado_por: string | null
          escavador_monitoramento_id: number | null
          escritorio_id: string
          fase: string | null
          id: string
          indice_correcao: string | null
          instancia: string | null
          link_tribunal: string | null
          modalidade_cobranca: string | null
          numero_cnj: string | null
          numero_pasta: string | null
          objeto_acao: string | null
          observacoes: string | null
          outros_numeros: Json | null
          parte_contraria: string | null
          polo_cliente: string
          processo_principal_id: string | null
          provisao_perda: string | null
          provisao_sugerida: number | null
          responsavel_id: string
          resultado: string | null
          resumo_encerramento: string | null
          reu: string | null
          rito: string | null
          status: string
          tags: string[] | null
          tipo: string
          tipo_derivado: string | null
          tribunal: string | null
          uf: string | null
          updated_at: string | null
          valor_acordo: number | null
          valor_atualizado: number | null
          valor_causa: number | null
          valor_condenacao: number | null
          vara: string | null
        }
        Insert: {
          area: Database["public"]["Enums"]["area_juridica_enum"]
          autor?: string | null
          cliente_id: string
          colaboradores_ids?: string[] | null
          comarca?: string | null
          consultivo_origem_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_arquivamento?: string | null
          data_distribuicao: string
          data_encerramento?: string | null
          data_transito_julgado?: string | null
          data_ultima_atualizacao_monetaria?: string | null
          encerrado_em?: string | null
          encerrado_por?: string | null
          escavador_monitoramento_id?: number | null
          escritorio_id: string
          fase?: string | null
          id?: string
          indice_correcao?: string | null
          instancia?: string | null
          link_tribunal?: string | null
          modalidade_cobranca?: string | null
          numero_cnj?: string | null
          numero_pasta?: string | null
          objeto_acao?: string | null
          observacoes?: string | null
          outros_numeros?: Json | null
          parte_contraria?: string | null
          polo_cliente: string
          processo_principal_id?: string | null
          provisao_perda?: string | null
          provisao_sugerida?: number | null
          responsavel_id: string
          resultado?: string | null
          resumo_encerramento?: string | null
          reu?: string | null
          rito?: string | null
          status?: string
          tags?: string[] | null
          tipo: string
          tipo_derivado?: string | null
          tribunal?: string | null
          uf?: string | null
          updated_at?: string | null
          valor_acordo?: number | null
          valor_atualizado?: number | null
          valor_causa?: number | null
          valor_condenacao?: number | null
          vara?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["area_juridica_enum"]
          autor?: string | null
          cliente_id?: string
          colaboradores_ids?: string[] | null
          comarca?: string | null
          consultivo_origem_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_arquivamento?: string | null
          data_distribuicao?: string
          data_encerramento?: string | null
          data_transito_julgado?: string | null
          data_ultima_atualizacao_monetaria?: string | null
          encerrado_em?: string | null
          encerrado_por?: string | null
          escavador_monitoramento_id?: number | null
          escritorio_id?: string
          fase?: string | null
          id?: string
          indice_correcao?: string | null
          instancia?: string | null
          link_tribunal?: string | null
          modalidade_cobranca?: string | null
          numero_cnj?: string | null
          numero_pasta?: string | null
          objeto_acao?: string | null
          observacoes?: string | null
          outros_numeros?: Json | null
          parte_contraria?: string | null
          polo_cliente?: string
          processo_principal_id?: string | null
          provisao_perda?: string | null
          provisao_sugerida?: number | null
          responsavel_id?: string
          resultado?: string | null
          resumo_encerramento?: string | null
          reu?: string | null
          rito?: string | null
          status?: string
          tags?: string[] | null
          tipo?: string
          tipo_derivado?: string | null
          tribunal?: string | null
          uf?: string | null
          updated_at?: string | null
          valor_acordo?: number | null
          valor_atualizado?: number | null
          valor_causa?: number | null
          valor_condenacao?: number | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_consultivo_origem_id_fkey"
            columns: ["consultivo_origem_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_consultivo_origem_id_fkey"
            columns: ["consultivo_origem_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_consultivo_origem_id_fkey"
            columns: ["consultivo_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "processos_processos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "processos_processos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_processos_encerrado_por_fkey"
            columns: ["encerrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_encerrado_por_fkey"
            columns: ["encerrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_processos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_processo_principal_id_fkey"
            columns: ["processo_principal_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_processo_principal_id_fkey"
            columns: ["processo_principal_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_processo_principal_id_fkey"
            columns: ["processo_principal_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_processo_principal_id_fkey"
            columns: ["processo_principal_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "processos_processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          escritorio_id: string | null
          id: string
          nome_completo: string
          oab_numero: string | null
          oab_uf: string | null
          onboarding_completado_em: string | null
          onboarding_completo: boolean | null
          onboarding_etapa_atual: string | null
          preferencias: Json | null
          primeiro_acesso: boolean | null
          role: string | null
          telefone: string | null
          ultimo_escritorio_ativo: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          escritorio_id?: string | null
          id: string
          nome_completo: string
          oab_numero?: string | null
          oab_uf?: string | null
          onboarding_completado_em?: string | null
          onboarding_completo?: boolean | null
          onboarding_etapa_atual?: string | null
          preferencias?: Json | null
          primeiro_acesso?: boolean | null
          role?: string | null
          telefone?: string | null
          ultimo_escritorio_ativo?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          escritorio_id?: string | null
          id?: string
          nome_completo?: string
          oab_numero?: string | null
          oab_uf?: string | null
          onboarding_completado_em?: string | null
          onboarding_completo?: boolean | null
          onboarding_etapa_atual?: string | null
          preferencias?: Json | null
          primeiro_acesso?: boolean | null
          role?: string | null
          telefone?: string | null
          ultimo_escritorio_ativo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ultimo_escritorio_ativo_fkey"
            columns: ["ultimo_escritorio_ativo"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_analises: {
        Row: {
          acoes_sugeridas: Json | null
          confianca_analise: number | null
          data_intimacao: string | null
          data_limite: string | null
          determinacoes: Json | null
          escritorio_id: string
          fundamentacao_legal: string | null
          id: string
          metadados_extras: Json | null
          modelo: string | null
          pontos_principais: Json | null
          prazo_dias: number | null
          prazo_tipo_dias: string | null
          processado_em: string | null
          publicacao_id: string
          requer_manifestacao: boolean | null
          resultado: Json | null
          resumo_executivo: string | null
          sentimento: string | null
          tem_determinacao: boolean | null
          tem_prazo: boolean | null
          template_sugerido: string | null
          tipo_decisao: string | null
          tipo_prazo: string | null
          tokens_usados: number | null
        }
        Insert: {
          acoes_sugeridas?: Json | null
          confianca_analise?: number | null
          data_intimacao?: string | null
          data_limite?: string | null
          determinacoes?: Json | null
          escritorio_id: string
          fundamentacao_legal?: string | null
          id?: string
          metadados_extras?: Json | null
          modelo?: string | null
          pontos_principais?: Json | null
          prazo_dias?: number | null
          prazo_tipo_dias?: string | null
          processado_em?: string | null
          publicacao_id: string
          requer_manifestacao?: boolean | null
          resultado?: Json | null
          resumo_executivo?: string | null
          sentimento?: string | null
          tem_determinacao?: boolean | null
          tem_prazo?: boolean | null
          template_sugerido?: string | null
          tipo_decisao?: string | null
          tipo_prazo?: string | null
          tokens_usados?: number | null
        }
        Update: {
          acoes_sugeridas?: Json | null
          confianca_analise?: number | null
          data_intimacao?: string | null
          data_limite?: string | null
          determinacoes?: Json | null
          escritorio_id?: string
          fundamentacao_legal?: string | null
          id?: string
          metadados_extras?: Json | null
          modelo?: string | null
          pontos_principais?: Json | null
          prazo_dias?: number | null
          prazo_tipo_dias?: string | null
          processado_em?: string | null
          publicacao_id?: string
          requer_manifestacao?: boolean | null
          resultado?: Json | null
          resumo_executivo?: string | null
          sentimento?: string | null
          tem_determinacao?: boolean | null
          tem_prazo?: boolean | null
          template_sugerido?: string | null
          tipo_decisao?: string | null
          tipo_prazo?: string | null
          tokens_usados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_publicacoes_analises_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_analises_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: true
            referencedRelation: "publicacoes_publicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_analises_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: true
            referencedRelation: "v_publicacoes_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_analises_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: true
            referencedRelation: "v_publicacoes_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_analises_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: true
            referencedRelation: "v_publicacoes_urgentes"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_associados: {
        Row: {
          aasp_chave: string
          ativo: boolean | null
          created_at: string | null
          escritorio_id: string
          id: string
          nome: string
          oab_numero: string
          oab_uf: string
          publicacoes_sync_count: number | null
          ultima_sync: string | null
          updated_at: string | null
        }
        Insert: {
          aasp_chave: string
          ativo?: boolean | null
          created_at?: string | null
          escritorio_id: string
          id?: string
          nome: string
          oab_numero: string
          oab_uf?: string
          publicacoes_sync_count?: number | null
          ultima_sync?: string | null
          updated_at?: string | null
        }
        Update: {
          aasp_chave?: string
          ativo?: boolean | null
          created_at?: string | null
          escritorio_id?: string
          id?: string
          nome?: string
          oab_numero?: string
          oab_uf?: string
          publicacoes_sync_count?: number | null
          ultima_sync?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_associados_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_config: {
        Row: {
          api_token: string | null
          api_url: string | null
          ativo: boolean | null
          auto_vincular_por_cliente: boolean | null
          auto_vincular_por_numero: boolean | null
          created_at: string | null
          escritorio_id: string
          id: string
          notificar_apenas_urgentes: boolean | null
          notificar_users: string[] | null
          palavras_chave_urgencia: string[] | null
          prazo_minimo_urgencia: number | null
          proxima_sincronizacao: string | null
          resumo_diario: boolean | null
          sync_frequencia_horas: number | null
          tipos_alerta_imediato: string[] | null
          ultima_sincronizacao: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_token?: string | null
          api_url?: string | null
          ativo?: boolean | null
          auto_vincular_por_cliente?: boolean | null
          auto_vincular_por_numero?: boolean | null
          created_at?: string | null
          escritorio_id: string
          id?: string
          notificar_apenas_urgentes?: boolean | null
          notificar_users?: string[] | null
          palavras_chave_urgencia?: string[] | null
          prazo_minimo_urgencia?: number | null
          proxima_sincronizacao?: string | null
          resumo_diario?: boolean | null
          sync_frequencia_horas?: number | null
          tipos_alerta_imediato?: string[] | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_token?: string | null
          api_url?: string | null
          ativo?: boolean | null
          auto_vincular_por_cliente?: boolean | null
          auto_vincular_por_numero?: boolean | null
          created_at?: string | null
          escritorio_id?: string
          id?: string
          notificar_apenas_urgentes?: boolean | null
          notificar_users?: string[] | null
          palavras_chave_urgencia?: string[] | null
          prazo_minimo_urgencia?: number | null
          proxima_sincronizacao?: string | null
          resumo_diario?: boolean | null
          sync_frequencia_horas?: number | null
          tipos_alerta_imediato?: string[] | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_config_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: true
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_historico: {
        Row: {
          acao: string
          created_at: string | null
          detalhes: Json | null
          escritorio_id: string
          id: string
          publicacao_id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          detalhes?: Json | null
          escritorio_id: string
          id?: string
          publicacao_id: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          detalhes?: Json | null
          escritorio_id?: string
          id?: string
          publicacao_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_publicacoes_historico_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_historico_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_publicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_historico_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_historico_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_historico_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_urgentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      publicacoes_notificacoes: {
        Row: {
          created_at: string | null
          enviado: boolean | null
          enviado_em: string | null
          escritorio_id: string
          id: string
          lido: boolean | null
          lido_em: string | null
          metodo: string
          publicacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enviado?: boolean | null
          enviado_em?: string | null
          escritorio_id: string
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          metodo: string
          publicacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          enviado?: boolean | null
          enviado_em?: string | null
          escritorio_id?: string
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          metodo?: string
          publicacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_publicacoes_notificacoes_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_notificacoes_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_publicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_notificacoes_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_notificacoes_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_notificacoes_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_urgentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      publicacoes_publicacoes: {
        Row: {
          aasp_id: string | null
          agendamento_id: string | null
          agendamento_tipo: string | null
          associado_id: string | null
          cliente_id: string | null
          confianca_vinculacao: number | null
          created_at: string | null
          data_captura: string | null
          data_publicacao: string
          duplicata_revisada: boolean | null
          escavador_aparicao_id: string | null
          escavador_monitoramento_id: string | null
          escritorio_id: string
          hash_conteudo: string | null
          id: string
          is_snippet: boolean | null
          numero_processo: string | null
          partes: string[] | null
          pdf_url: string | null
          processo_id: string | null
          source: string | null
          source_type: string | null
          status: string | null
          texto_completo: string
          tipo_publicacao: string
          tribunal: string
          updated_at: string | null
          urgente: boolean | null
          vara: string | null
        }
        Insert: {
          aasp_id?: string | null
          agendamento_id?: string | null
          agendamento_tipo?: string | null
          associado_id?: string | null
          cliente_id?: string | null
          confianca_vinculacao?: number | null
          created_at?: string | null
          data_captura?: string | null
          data_publicacao: string
          duplicata_revisada?: boolean | null
          escavador_aparicao_id?: string | null
          escavador_monitoramento_id?: string | null
          escritorio_id: string
          hash_conteudo?: string | null
          id?: string
          is_snippet?: boolean | null
          numero_processo?: string | null
          partes?: string[] | null
          pdf_url?: string | null
          processo_id?: string | null
          source?: string | null
          source_type?: string | null
          status?: string | null
          texto_completo: string
          tipo_publicacao: string
          tribunal: string
          updated_at?: string | null
          urgente?: boolean | null
          vara?: string | null
        }
        Update: {
          aasp_id?: string | null
          agendamento_id?: string | null
          agendamento_tipo?: string | null
          associado_id?: string | null
          cliente_id?: string | null
          confianca_vinculacao?: number | null
          created_at?: string | null
          data_captura?: string | null
          data_publicacao?: string
          duplicata_revisada?: boolean | null
          escavador_aparicao_id?: string | null
          escavador_monitoramento_id?: string | null
          escritorio_id?: string
          hash_conteudo?: string | null
          id?: string
          is_snippet?: boolean | null
          numero_processo?: string | null
          partes?: string[] | null
          pdf_url?: string | null
          processo_id?: string | null
          source?: string | null
          source_type?: string | null
          status?: string | null
          texto_completo?: string
          tipo_publicacao?: string
          tribunal?: string
          updated_at?: string | null
          urgente?: boolean | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_publicacoes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      publicacoes_sincronizacoes: {
        Row: {
          associado_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          erro_mensagem: string | null
          escritorio_id: string
          id: string
          publicacoes_atualizadas: number | null
          publicacoes_novas: number | null
          sucesso: boolean | null
          tipo: string
          triggered_by: string | null
        }
        Insert: {
          associado_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          erro_mensagem?: string | null
          escritorio_id: string
          id?: string
          publicacoes_atualizadas?: number | null
          publicacoes_novas?: number | null
          sucesso?: boolean | null
          tipo: string
          triggered_by?: string | null
        }
        Update: {
          associado_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          erro_mensagem?: string | null
          escritorio_id?: string
          id?: string
          publicacoes_atualizadas?: number | null
          publicacoes_novas?: number | null
          sucesso?: boolean | null
          tipo?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_sincronizacoes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_sincronizacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_sincronizacoes_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_sincronizacoes_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      publicacoes_sync_escavador: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          erro_mensagem: string | null
          escritorio_id: string
          id: string
          publicacoes_duplicadas: number | null
          publicacoes_novas: number | null
          publicacoes_vinculadas: number | null
          sucesso: boolean | null
          termo_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          erro_mensagem?: string | null
          escritorio_id: string
          id?: string
          publicacoes_duplicadas?: number | null
          publicacoes_novas?: number | null
          publicacoes_vinculadas?: number | null
          sucesso?: boolean | null
          termo_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          erro_mensagem?: string | null
          escritorio_id?: string
          id?: string
          publicacoes_duplicadas?: number | null
          publicacoes_novas?: number | null
          publicacoes_vinculadas?: number | null
          sucesso?: boolean | null
          termo_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_sync_escavador_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_sync_escavador_termo_id_fkey"
            columns: ["termo_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_termos_escavador"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_termos_escavador: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          escavador_erro: string | null
          escavador_monitoramento_id: string | null
          escavador_status: string | null
          escritorio_id: string
          id: string
          origens_ids: number[] | null
          termo: string
          termos_auxiliares: Json | null
          total_aparicoes: number | null
          ultima_aparicao: string | null
          ultima_sync: string | null
          updated_at: string | null
          variacoes: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          escavador_erro?: string | null
          escavador_monitoramento_id?: string | null
          escavador_status?: string | null
          escritorio_id: string
          id?: string
          origens_ids?: number[] | null
          termo: string
          termos_auxiliares?: Json | null
          total_aparicoes?: number | null
          ultima_aparicao?: string | null
          ultima_sync?: string | null
          updated_at?: string | null
          variacoes?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          escavador_erro?: string | null
          escavador_monitoramento_id?: string | null
          escavador_status?: string | null
          escritorio_id?: string
          id?: string
          origens_ids?: number[] | null
          termo?: string
          termos_auxiliares?: Json | null
          total_aparicoes?: number | null
          ultima_aparicao?: string | null
          ultima_sync?: string | null
          updated_at?: string | null
          variacoes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_termos_escavador_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_tratamentos: {
        Row: {
          acao_tomada: string
          editou_sugestao: boolean | null
          escritorio_id: string
          evento_id: string | null
          id: string
          observacoes: string | null
          processado_em: string | null
          processado_por: string
          publicacao_id: string
          tempo_processamento_segundos: number | null
        }
        Insert: {
          acao_tomada: string
          editou_sugestao?: boolean | null
          escritorio_id: string
          evento_id?: string | null
          id?: string
          observacoes?: string | null
          processado_em?: string | null
          processado_por: string
          publicacao_id: string
          tempo_processamento_segundos?: number | null
        }
        Update: {
          acao_tomada?: string
          editou_sugestao?: boolean | null
          escritorio_id?: string
          evento_id?: string | null
          id?: string
          observacoes?: string | null
          processado_em?: string | null
          processado_por?: string
          publicacao_id?: string
          tempo_processamento_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_publicacoes_tratamentos_escritorio"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_publicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "v_publicacoes_urgentes"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_gerados: {
        Row: {
          andamentos_salvos: boolean
          arquivo_nome: string | null
          arquivo_url: string | null
          clientes_ids: string[]
          colunas_usadas: string[] | null
          created_at: string
          erro_mensagem: string | null
          escritorio_id: string
          gerado_por: string | null
          id: string
          processos_ids: string[] | null
          resumos_ia: Json | null
          status: string
          template_id: string | null
          titulo: string
        }
        Insert: {
          andamentos_salvos?: boolean
          arquivo_nome?: string | null
          arquivo_url?: string | null
          clientes_ids?: string[]
          colunas_usadas?: string[] | null
          created_at?: string
          erro_mensagem?: string | null
          escritorio_id: string
          gerado_por?: string | null
          id?: string
          processos_ids?: string[] | null
          resumos_ia?: Json | null
          status?: string
          template_id?: string | null
          titulo: string
        }
        Update: {
          andamentos_salvos?: boolean
          arquivo_nome?: string | null
          arquivo_url?: string | null
          clientes_ids?: string[]
          colunas_usadas?: string[] | null
          created_at?: string
          erro_mensagem?: string | null
          escritorio_id?: string
          gerado_por?: string | null
          id?: string
          processos_ids?: string[] | null
          resumos_ia?: Json | null
          status?: string
          template_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_gerados_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_gerados_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_gerados_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relatorios_gerados_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "relatorios_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_templates: {
        Row: {
          ativo: boolean
          colunas: string[]
          created_at: string
          criado_por: string | null
          descricao: string | null
          escritorio_id: string
          id: string
          incluir_logo: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          colunas?: string[]
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          escritorio_id: string
          id?: string
          incluir_logo?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          colunas?: string[]
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          escritorio_id?: string
          id?: string
          incluir_logo?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relatorios_templates_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      sistema_indices_economicos: {
        Row: {
          acumulado_12m: number | null
          acumulado_ano: number | null
          codigo_bcb: number
          created_at: string | null
          fonte: string | null
          id: string
          indice: string
          mes_referencia: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          acumulado_12m?: number | null
          acumulado_ano?: number | null
          codigo_bcb: number
          created_at?: string | null
          fonte?: string | null
          id?: string
          indice: string
          mes_referencia: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          acumulado_12m?: number | null
          acumulado_ano?: number | null
          codigo_bcb?: number
          created_at?: string | null
          fonte?: string | null
          id?: string
          indice?: string
          mes_referencia?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          encrypted: boolean | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          encrypted?: boolean | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          encrypted?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      tags_master: {
        Row: {
          ativa: boolean | null
          contexto: string
          cor: string
          created_at: string | null
          created_by: string | null
          descricao: string | null
          escritorio_id: string
          icone: string | null
          id: string
          is_predefinida: boolean | null
          nome: string
          ordem: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ativa?: boolean | null
          contexto: string
          cor: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          escritorio_id: string
          icone?: string | null
          id?: string
          is_predefinida?: boolean | null
          nome: string
          ordem?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ativa?: boolean | null
          contexto?: string
          cor?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          escritorio_id?: string
          icone?: string | null
          id?: string
          is_predefinida?: boolean | null
          nome?: string
          ordem?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tags_master_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_master_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_master_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      timers_ativos: {
        Row: {
          audiencia_id: string | null
          consulta_id: string | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string
          evento_id: string | null
          faturavel: boolean | null
          hora_inicio: string
          hora_pausa: string | null
          id: string
          processo_id: string | null
          segundos_acumulados: number | null
          status: string
          tarefa_id: string | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audiencia_id?: string | null
          consulta_id?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id: string
          evento_id?: string | null
          faturavel?: boolean | null
          hora_inicio?: string
          hora_pausa?: string | null
          id?: string
          processo_id?: string | null
          segundos_acumulados?: number | null
          status?: string
          tarefa_id?: string | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audiencia_id?: string | null
          consulta_id?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          escritorio_id?: string
          evento_id?: string | null
          faturavel?: boolean | null
          hora_inicio?: string
          hora_pausa?: string | null
          id?: string
          processo_id?: string | null
          segundos_acumulados?: number | null
          status?: string
          tarefa_id?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timers_ativos_audiencia_id_fkey"
            columns: ["audiencia_id"]
            isOneToOne: false
            referencedRelation: "agenda_audiencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "timers_ativos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "timers_ativos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "agenda_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_escritorios_roles: {
        Row: {
          created_at: string | null
          escritorio_id: string
          id: string
          percentual_comissao: number | null
          pode_aprovar_horas: boolean | null
          pode_faturar: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          escritorio_id: string
          id?: string
          percentual_comissao?: number | null
          pode_aprovar_horas?: boolean | null
          pode_faturar?: boolean | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          escritorio_id?: string
          id?: string
          percentual_comissao?: number | null
          pode_aprovar_horas?: boolean | null
          pode_faturar?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_escritorios_roles_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_escritorios_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_escritorios_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      onboarding_progress: {
        Row: {
          escritorio_id: string | null
          etapas_completas: number | null
          etapas_puladas: number | null
          onboarding_completo: boolean | null
          primeiro_acesso: boolean | null
          progresso_percentual: number | null
          setup_completo: boolean | null
          total_etapas: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usuarios_escritorio_ativo: {
        Row: {
          escritorio_id: string | null
          user_id: string | null
        }
        Insert: {
          escritorio_id?: never
          user_id?: string | null
        }
        Update: {
          escritorio_id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      v_agenda_consolidada: {
        Row: {
          caso_titulo: string | null
          consultivo_id: string | null
          consultivo_titulo: string | null
          cor: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          dia_inteiro: boolean | null
          escritorio_id: string | null
          id: string | null
          local: string | null
          prazo_cumprido: boolean | null
          prazo_data_limite: string | null
          prazo_tipo: string | null
          prioridade: string | null
          processo_id: string | null
          processo_numero: string | null
          recorrencia_id: string | null
          responsaveis_ids: string[] | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          subtipo: string | null
          tipo_entidade: string | null
          titulo: string | null
          todos_responsaveis: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_alertas_cobranca_pendentes: {
        Row: {
          ato_codigo: string | null
          ato_nome: string | null
          ato_tipo_id: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string | null
          id: string | null
          movimentacao_data: string | null
          movimentacao_descricao: string | null
          movimentacao_id: string | null
          movimentacao_tipo: string | null
          processo_area:
            | Database["public"]["Enums"]["area_juridica_enum"]
            | null
          processo_id: string | null
          processo_numero: string | null
          processo_pasta: string | null
          status: string | null
          tipo_alerta: string | null
          titulo: string | null
          valor_sugerido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_alertas_cobranca_ato_tipo_id_fkey"
            columns: ["ato_tipo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_atos_processuais_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_alertas_cobranca_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_atos_hora_processo: {
        Row: {
          atingiu_maximo: boolean | null
          ato_codigo: string | null
          ato_nome: string | null
          ato_tipo_id: string | null
          cliente_nome: string | null
          contrato_id: string | null
          created_at: string | null
          escritorio_id: string | null
          finalizado_em: string | null
          horas_disponiveis: number | null
          horas_excedentes: number | null
          horas_faturaveis: number | null
          horas_maximas: number | null
          horas_minimas: number | null
          horas_totais: number | null
          id: string | null
          processo_id: string | null
          processo_numero: string | null
          processo_pasta: string | null
          receita_id: string | null
          status: string | null
          updated_at: string | null
          valor_atual: number | null
          valor_hora: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_ato_tipo_id_fkey"
            columns: ["ato_tipo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_atos_processuais_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_horas_acumuladas_ato_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "v_historico_cobrancas_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_consultivo_consultas: {
        Row: {
          andamentos: Json | null
          anexos: Json | null
          area: string | null
          cliente_id: string | null
          cliente_nome: string | null
          contrato_id: string | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string | null
          id: string | null
          numero: string | null
          prazo: string | null
          prioridade: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["status_consultivo"] | null
          titulo: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultivo_consultas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "consultivo_consultas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultivo_consultas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_contas_bancarias_saldo: {
        Row: {
          agencia: string | null
          ativa: boolean | null
          banco: string | null
          conta_principal: boolean | null
          created_at: string | null
          data_abertura: string | null
          escritorio_id: string | null
          id: string | null
          numero_conta: string | null
          saldo_atual: number | null
          saldo_calculado: number | null
          saldo_inicial: number | null
          tipo_conta: string | null
          titular: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean | null
          banco?: string | null
          conta_principal?: boolean | null
          created_at?: string | null
          data_abertura?: string | null
          escritorio_id?: string | null
          id?: string | null
          numero_conta?: string | null
          saldo_atual?: number | null
          saldo_calculado?: never
          saldo_inicial?: number | null
          tipo_conta?: string | null
          titular?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativa?: boolean | null
          banco?: string | null
          conta_principal?: boolean | null
          created_at?: string | null
          data_abertura?: string | null
          escritorio_id?: string | null
          id?: string | null
          numero_conta?: string | null
          saldo_atual?: number | null
          saldo_calculado?: never
          saldo_inicial?: number | null
          tipo_conta?: string | null
          titular?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_contas_receber_pagar: {
        Row: {
          categoria: string | null
          cliente_fornecedor: string | null
          cliente_id: string | null
          data_vencimento: string | null
          descricao: string | null
          dias_atraso: number | null
          escritorio_id: string | null
          fornecedor_id: string | null
          id: string | null
          processo_id: string | null
          status: string | null
          tipo_conta: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_crm_pessoas_resumo: {
        Row: {
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          escritorio_id: string | null
          id: string | null
          nome_completo: string | null
          nome_fantasia: string | null
          oportunidades_ativas: number | null
          origem: Database["public"]["Enums"]["origem_crm_enum"] | null
          status: Database["public"]["Enums"]["status_pessoa_enum"] | null
          tags: string[] | null
          telefone: string | null
          tipo_cadastro:
            | Database["public"]["Enums"]["tipo_cadastro_enum"]
            | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          uf: Database["public"]["Enums"]["uf_enum"] | null
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          escritorio_id?: string | null
          id?: string | null
          nome_completo?: string | null
          nome_fantasia?: string | null
          oportunidades_ativas?: never
          origem?: Database["public"]["Enums"]["origem_crm_enum"] | null
          status?: Database["public"]["Enums"]["status_pessoa_enum"] | null
          tags?: string[] | null
          telefone?: string | null
          tipo_cadastro?:
            | Database["public"]["Enums"]["tipo_cadastro_enum"]
            | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          uf?: Database["public"]["Enums"]["uf_enum"] | null
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          escritorio_id?: string | null
          id?: string | null
          nome_completo?: string | null
          nome_fantasia?: string | null
          oportunidades_ativas?: never
          origem?: Database["public"]["Enums"]["origem_crm_enum"] | null
          status?: Database["public"]["Enums"]["status_pessoa_enum"] | null
          tags?: string[] | null
          telefone?: string | null
          tipo_cadastro?:
            | Database["public"]["Enums"]["tipo_cadastro_enum"]
            | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          uf?: Database["public"]["Enums"]["uf_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dashboard_financeiro_metricas: {
        Row: {
          atrasado: number | null
          despesas_mes: number | null
          escritorio_id: string | null
          pendente_receber: number | null
          qtd_atrasados: number | null
          qtd_pendentes: number | null
          receita_mes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_receitas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_despesas_reembolsaveis_pendentes: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          escritorio_id: string | null
          fornecedor: string | null
          id: string | null
          processo_id: string | null
          processo_numero: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "despesas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_despesas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      v_extrato_financeiro: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          conta_bancaria_id: string | null
          conta_bancaria_nome: string | null
          data_efetivacao: string | null
          data_referencia: string | null
          data_vencimento: string | null
          descricao: string | null
          entidade: string | null
          escritorio_id: string | null
          id: string | null
          origem: string | null
          origem_id: string | null
          processo_id: string | null
          status: string | null
          tipo_movimento: string | null
          valor: number | null
          valor_pago: number | null
        }
        Relationships: []
      }
      v_faturas_geradas: {
        Row: {
          categoria_status: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          data_emissao: string | null
          data_vencimento: string | null
          dias_ate_vencimento: number | null
          enviada_em: string | null
          escritorio_id: string | null
          fatura_id: string | null
          gerada_automaticamente: boolean | null
          numero_fatura: string | null
          numero_parcelas: number | null
          observacoes: string | null
          paga_em: string | null
          parcelado: boolean | null
          pdf_url: string | null
          qtd_honorarios: number | null
          qtd_horas: number | null
          soma_horas: number | null
          status: string | null
          total_honorarios: number | null
          total_horas: number | null
          updated_at: string | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_financeiro_enums: {
        Row: {
          descricao: string | null
          enum_name: string | null
          tabelas_uso: string[] | null
          valores: string[] | null
        }
        Relationships: []
      }
      v_historico_cobrancas_processo: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          escritorio_id: string | null
          id: string | null
          processo_id: string | null
          processo_numero: string | null
          processo_pasta: string | null
          status: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      v_indices_economicos_atual: {
        Row: {
          acumulado_12m: number | null
          acumulado_ano: number | null
          codigo_bcb: number | null
          indice: string | null
          mes_referencia: string | null
          updated_at: string | null
          valor_mes: number | null
        }
        Relationships: []
      }
      v_lancamentos_prontos_faturar: {
        Row: {
          cargo_nome: string | null
          categoria: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          competencia: string | null
          consulta_id: string | null
          contrato_id: string | null
          contrato_titulo: string | null
          created_at: string | null
          data_trabalho: string | null
          data_vencimento: string | null
          descricao: string | null
          escritorio_id: string | null
          fechamento_id: string | null
          horas: number | null
          lancamento_id: string | null
          numero_contrato: string | null
          partes_resumo: string | null
          processo_id: string | null
          processo_numero: string | null
          processo_pasta: string | null
          processos_lista: Json | null
          profissional_nome: string | null
          qtd_processos: number | null
          subtipo: string | null
          tipo_lancamento: string | null
          valor: number | null
          valor_unitario: number | null
        }
        Relationships: []
      }
      v_pecas_templates_ativos: {
        Row: {
          area: string | null
          ativo: boolean | null
          categoria: string | null
          conteudo_template: string | null
          created_at: string | null
          criado_por: string | null
          criador_nome: string | null
          escritorio_id: string | null
          estrutura: Json | null
          id: string | null
          nome: string | null
          tipo_processo: string | null
          updated_at: string | null
          uso_count: number | null
          variaveis: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pecas_templates_completos: {
        Row: {
          area: string | null
          ativo: boolean | null
          categoria: string | null
          conteudo_template: string | null
          created_at: string | null
          criado_por: string | null
          criador_nome: string | null
          escritorio_id: string | null
          estrutura: Json | null
          id: string | null
          nome: string | null
          tipo_processo: string | null
          total_juris_vinculadas: number | null
          total_teses_vinculadas: number | null
          updated_at: string | null
          uso_count: number | null
          variaveis: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_templates_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pecas_teses_ativas: {
        Row: {
          area: string | null
          ativa: boolean | null
          atualizado_por: string | null
          created_at: string | null
          criado_por: string | null
          criador_nome: string | null
          escritorio_id: string | null
          fundamentacao: string | null
          id: string | null
          resumo: string | null
          subtema: string | null
          tags: string[] | null
          texto_completo: string | null
          titulo: string | null
          updated_at: string | null
          uso_count: number | null
          vezes_usada_em_pecas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teses_teses_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pecas_teses_teses_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_portfolio_metricas_area: {
        Row: {
          area_juridica: string | null
          duracao_media_dias: number | null
          escritorio_id: string | null
          produtos_ativos: number | null
          projetos_concluidos: number | null
          projetos_em_andamento: number | null
          receita_total: number | null
          total_produtos: number | null
          total_projetos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_portfolio_produtos_catalogo: {
        Row: {
          area_juridica: string | null
          categoria: string | null
          codigo: string | null
          complexidade: string | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          descricao_comercial: string | null
          duracao_estimada_dias: number | null
          duracao_media_real: number | null
          escritorio_id: string | null
          execucoes_concluidas: number | null
          icone: string | null
          id: string | null
          nome: string | null
          preco_base: number | null
          status: string | null
          tags: string[] | null
          taxa_sucesso: number | null
          total_execucoes: number | null
          total_fases: number | null
          total_papeis: number | null
          total_precos: number | null
          updated_at: string | null
          versao_atual: number | null
          visivel_catalogo: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_produtos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_portfolio_projetos_completos: {
        Row: {
          area_juridica: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_tipo: string | null
          codigo: string | null
          created_at: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_prevista_conclusao: string | null
          escritorio_id: string | null
          fases_concluidas: number | null
          id: string | null
          nome: string | null
          processo_id: string | null
          produto_codigo: string | null
          produto_cor: string | null
          produto_icone: string | null
          produto_id: string | null
          produto_nome: string | null
          produto_versao: number | null
          progresso_percentual: number | null
          responsavel_id: string | null
          responsavel_nome: string | null
          resultado: string | null
          status: string | null
          total_aprendizados: number | null
          total_equipe: number | null
          total_fases: number | null
          updated_at: string | null
          valor_negociado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "portfolio_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_produtos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_processos_com_movimentacoes: {
        Row: {
          area: Database["public"]["Enums"]["area_juridica_enum"] | null
          cliente_id: string | null
          cliente_nome: string | null
          contrato_id: string | null
          escavador_monitoramento_id: number | null
          escritorio_id: string | null
          fase: string | null
          id: string | null
          instancia: string | null
          movimentacoes_nao_lidas: number | null
          numero_cnj: string | null
          numero_pasta: string | null
          parte_contraria: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          ultima_movimentacao: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contratos_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_receitas_por_contrato"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "processos_processos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_processos_criticos: {
        Row: {
          area: Database["public"]["Enums"]["area_juridica_enum"] | null
          cliente_id: string | null
          cliente_nome: string | null
          escritorio_id: string | null
          fase: string | null
          id: string | null
          movimentacoes_nao_lidas: number | null
          numero_cnj: string | null
          numero_pasta: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_processos_dashboard: {
        Row: {
          escritorio_id: string | null
          provisao_total: number | null
          total_arquivados: number | null
          total_ativos: number | null
          total_civel: number | null
          total_suspensos: number | null
          total_trabalhista: number | null
          total_tributaria: number | null
          valor_causa_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_processos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_publicacoes_completas: {
        Row: {
          aasp_id: string | null
          acao_tomada: string | null
          acoes_sugeridas: Json | null
          analise_processada_em: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          cliente_tipo: string | null
          confianca_analise: number | null
          created_at: string | null
          data_captura: string | null
          data_intimacao: string | null
          data_limite: string | null
          data_publicacao: string | null
          determinacoes: Json | null
          editou_sugestao: boolean | null
          escritorio_id: string | null
          evento_data_inicio: string | null
          evento_id: string | null
          evento_tipo: string | null
          evento_titulo: string | null
          fundamentacao_legal: string | null
          hash_conteudo: string | null
          id: string | null
          metadados_extras: Json | null
          numero_processo: string | null
          partes: string[] | null
          pdf_url: string | null
          pontos_principais: Json | null
          prazo_dias: number | null
          prazo_tipo_dias: string | null
          processado_por: string | null
          processado_por_email: string | null
          processado_por_nome: string | null
          processo_area:
            | Database["public"]["Enums"]["area_juridica_enum"]
            | null
          processo_id: string | null
          processo_numero_cnj: string | null
          processo_numero_pasta: string | null
          processo_objeto: string | null
          processo_status: string | null
          processo_tipo: string | null
          requer_manifestacao: boolean | null
          resumo_executivo: string | null
          sentimento: string | null
          source: string | null
          status: string | null
          tem_determinacao: boolean | null
          tem_prazo: boolean | null
          template_sugerido: string | null
          tempo_processamento_segundos: number | null
          texto_completo: string | null
          tipo_decisao: string | null
          tipo_prazo: string | null
          tipo_publicacao: string | null
          tratamento_observacoes: string | null
          tratamento_processado_em: string | null
          tribunal: string | null
          updated_at: string | null
          urgente: boolean | null
          vara: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tratamentos_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_publicacoes_dashboard: {
        Row: {
          arquivadas: number | null
          em_analise: number | null
          escritorio_id: string | null
          pendentes: number | null
          processadas: number | null
          processadas_hoje: number | null
          total_pendentes: number | null
          total_publicacoes: number | null
          ultima_atualizacao: string | null
          urgentes_nao_processadas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_publicacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_publicacoes_pendentes: {
        Row: {
          aasp_id: string | null
          acoes_sugeridas: Json | null
          cliente_id: string | null
          cliente_nome: string | null
          confianca_analise: number | null
          created_at: string | null
          data_captura: string | null
          data_intimacao: string | null
          data_limite: string | null
          data_publicacao: string | null
          escritorio_id: string | null
          fundamentacao_legal: string | null
          id: string | null
          numero_processo: string | null
          partes: string[] | null
          pdf_url: string | null
          pontos_principais: Json | null
          prazo_dias: number | null
          prazo_tipo_dias: string | null
          processo_id: string | null
          processo_numero_cnj: string | null
          processo_objeto: string | null
          processo_status: string | null
          resumo_executivo: string | null
          sentimento: string | null
          status: string | null
          tem_prazo: boolean | null
          texto_completo: string | null
          tipo_decisao: string | null
          tipo_prazo: string | null
          tipo_publicacao: string | null
          tribunal: string | null
          updated_at: string | null
          urgente: boolean | null
          vara: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      v_publicacoes_urgentes: {
        Row: {
          aasp_id: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          data_limite: string | null
          data_publicacao: string | null
          dias_restantes: number | null
          escritorio_id: string | null
          id: string | null
          numero_processo: string | null
          prazo_dias: number | null
          processo_id: string | null
          processo_numero_cnj: string | null
          processo_objeto: string | null
          status: string | null
          tem_prazo: boolean | null
          tipo_prazo: string | null
          tipo_publicacao: string | null
          tribunal: string | null
          urgente: boolean | null
          vara: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_publicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
      v_receitas_por_contrato: {
        Row: {
          cliente_id: string | null
          contrato_id: string | null
          escritorio_id: string | null
          inadimplente: boolean | null
          maior_atraso: number | null
          numero_contrato: string | null
          parcelas_pagas: number | null
          proxima_parcela: string | null
          total_parcelas: number | null
          valor_pendente: number | null
          valor_recebido: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_honorarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "crm_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_honorarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_pessoas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_honorarios_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_timers_ativos: {
        Row: {
          audiencia_id: string | null
          audiencia_titulo: string | null
          cliente_nome: string | null
          consulta_id: string | null
          consulta_titulo: string | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          escritorio_id: string | null
          evento_id: string | null
          evento_titulo: string | null
          faturavel: boolean | null
          hora_inicio: string | null
          hora_pausa: string | null
          id: string | null
          processo_id: string | null
          processo_numero: string | null
          segundos_acumulados: number | null
          status: string | null
          tarefa_id: string | null
          tarefa_titulo: string | null
          titulo: string | null
          updated_at: string | null
          user_id: string | null
          user_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timers_ativos_audiencia_id_fkey"
            columns: ["audiencia_id"]
            isOneToOne: false
            referencedRelation: "agenda_audiencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "timers_ativos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "timers_ativos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "agenda_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_ativos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_timesheet_aprovacao: {
        Row: {
          aprovado: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          atividade: string | null
          cliente_nome: string | null
          colaborador_nome: string | null
          consulta_id: string | null
          consulta_titulo: string | null
          contrato_id: string | null
          created_at: string | null
          data_trabalho: string | null
          editado: boolean | null
          editado_em: string | null
          editado_por: string | null
          escritorio_id: string | null
          fatura_id: string | null
          faturado: boolean | null
          faturavel: boolean | null
          faturavel_auto: boolean | null
          forma_cobranca_contrato: string | null
          hora_fim: string | null
          hora_inicio: string | null
          horas: number | null
          id: string | null
          justificativa_reprovacao: string | null
          nome_escritorio: string | null
          numero_processo: string | null
          origem: string | null
          processo_id: string | null
          processo_pasta: string | null
          processo_titulo: string | null
          reprovado: boolean | null
          reprovado_em: string | null
          reprovado_por: string | null
          status: string | null
          tarefa_id: string | null
          updated_at: string | null
          user_id: string | null
          valor_hora_calculado: number | null
          valor_total_estimado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "agenda_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_timesheet_fatura"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturamento_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_timesheet_fatura"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "v_faturas_geradas"
            referencedColumns: ["fatura_id"]
          },
          {
            foreignKeyName: "timesheet_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reprovado_por_fkey"
            columns: ["reprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reprovado_por_fkey"
            columns: ["reprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_timesheet_pendente_aprovacao: {
        Row: {
          aprovado: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          atividade: string | null
          cliente_nome: string | null
          colaborador_id: string | null
          colaborador_nome: string | null
          consulta_id: string | null
          created_at: string | null
          data_trabalho: string | null
          escritorio_id: string | null
          faturado: boolean | null
          faturavel: boolean | null
          hora_fim: string | null
          hora_inicio: string | null
          horas: number | null
          id: string | null
          justificativa_reprovacao: string | null
          numero_processo: string | null
          origem: string | null
          processo_id: string | null
          reprovado: boolean | null
          reprovado_em: string | null
          reprovado_por: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "v_consultivo_consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["consultivo_id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_timesheet_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
          {
            foreignKeyName: "timesheet_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reprovado_por_fkey"
            columns: ["reprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reprovado_por_fkey"
            columns: ["reprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_user_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_user_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "usuarios_escritorio_ativo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_consultivo_processos_convertidos: {
        Row: {
          cliente_nome: string | null
          consultivo_area: string | null
          consultivo_criado_em: string | null
          consultivo_id: string | null
          consultivo_numero: string | null
          consultivo_status:
            | Database["public"]["Enums"]["status_consultivo"]
            | null
          consultivo_titulo: string | null
          escritorio_id: string | null
          processo_cnj: string | null
          processo_criado_em: string | null
          processo_id: string | null
          processo_numero: string | null
          processo_status: string | null
          responsavel_nome: string | null
          tempo_conversao: unknown
        }
        Relationships: [
          {
            foreignKeyName: "consultivo_consultas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_depositos_resumo: {
        Row: {
          processo_id: string | null
          total_ativos: number | null
          total_convertidos: number | null
          total_levantados: number | null
          total_perdidos: number | null
          valor_ativo: number | null
          valor_convertido: number | null
          valor_levantado: number | null
          valor_perdido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_com_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "v_processos_criticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_depositos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "vw_consultivo_processos_convertidos"
            referencedColumns: ["processo_id"]
          },
        ]
      }
    }
    Functions: {
      add_movimentacao: {
        Args: { p_dados: Json; p_processo_id: string }
        Returns: string
      }
      ajustar_horarios_timesheet: {
        Args: {
          p_editado_por: string
          p_hora_fim: string
          p_hora_inicio: string
          p_timesheet_id: string
        }
        Returns: boolean
      }
      aplicar_limites_mensais: {
        Args: { p_contrato_id: string; p_valor_calculado: number }
        Returns: number
      }
      aplicar_reajuste_contrato: {
        Args: { p_contrato_id: string; p_indice?: string }
        Returns: Json
      }
      aprovar_fechamento_pasta: {
        Args: { p_fechamento_id: string; p_user_id: string }
        Returns: boolean
      }
      aprovar_timesheet: {
        Args: { p_aprovado_por: string; p_timesheet_ids: string[] }
        Returns: number
      }
      atualizar_receitas_atrasadas: { Args: never; Returns: number }
      atualizar_status_parcelas: { Args: never; Returns: number }
      atualizar_valor_processo: {
        Args: { p_processo_id: string }
        Returns: Json
      }
      atualizar_valores_processos_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: Json
      }
      auto_match_reconciliacao: {
        Args: { p_reconciliacao_id: string }
        Returns: number
      }
      cache_embedding: {
        Args: {
          p_embedding: string
          p_input_hash: string
          p_input_text: string
        }
        Returns: undefined
      }
      calcular_atualizacao_monetaria: {
        Args: {
          p_data_atualizacao: string
          p_data_base: string
          p_indice?: string
          p_valor: number
        }
        Returns: {
          fator_correcao: number
          meses_periodo: number
          valor_atualizado: number
          valor_original: number
          variacao_percentual: number
        }[]
      }
      calcular_correcao_monetaria: {
        Args: {
          p_data_final: string
          p_data_inicial: string
          p_indice?: string
          p_valor_original: number
        }
        Returns: {
          competencia_final: string
          competencia_inicial: string
          fator_correcao: number
          indice_final: number
          indice_inicial: number
          valor_corrigido: number
        }[]
      }
      calcular_data_fechamento_cartao: {
        Args: {
          p_dia_vencimento: number
          p_dias_antes: number
          p_mes_referencia: string
        }
        Returns: string
      }
      calcular_data_limite_prazo: {
        Args: {
          p_data_intimacao: string
          p_dias_uteis?: boolean
          p_escritorio_id?: string
          p_quantidade_dias: number
        }
        Returns: string
      }
      calcular_data_prazo:
        | {
            Args: {
              p_data_base: string
              p_dias_uteis?: boolean
              p_quantidade_dias: number
            }
            Returns: string
          }
        | {
            Args: {
              p_data_inicio: string
              p_prazo_dias: number
              p_tipo_dias?: string
            }
            Returns: string
          }
      calcular_faturabilidade_ato_hora: {
        Args: {
          p_ato_tipo_id: string
          p_horas_novas: number
          p_processo_id: string
        }
        Returns: {
          atingiu_maximo: boolean
          horas_acumuladas_antes: number
          horas_acumuladas_depois: number
          horas_excedentes: number
          horas_faturaveis: number
          horas_maximas: number
          valor_hora: number
        }[]
      }
      calcular_faturavel_timesheet: {
        Args: { p_consulta_id?: string; p_processo_id?: string }
        Returns: boolean
      }
      calcular_hash_extrato: {
        Args: {
          p_data: string
          p_descricao: string
          p_fitid?: string
          p_tipo: string
          p_valor: number
        }
        Returns: string
      }
      calcular_metricas_produto: {
        Args: { p_produto_id: string }
        Returns: undefined
      }
      calcular_proxima_execucao_recorrencia: {
        Args: {
          p_data_base: string
          p_dia_mes: number
          p_dias_semana: number[]
          p_frequencia: string
          p_intervalo: number
          p_mes: number
        }
        Returns: string
      }
      calcular_proximo_vencimento: {
        Args: {
          p_dia_vencimento?: number
          p_frequencia: string
          p_ultima_data: string
        }
        Returns: string
      }
      calcular_saldo_conta: { Args: { p_conta_id: string }; Returns: number }
      calcular_saldo_reconciliacao: {
        Args: { p_reconciliacao_id: string }
        Returns: number
      }
      calcular_valor_horas_faturar: {
        Args: { p_escritorio_id: string }
        Returns: number
      }
      calcular_valor_timesheet_mensal: {
        Args: { p_contrato_id: string; p_mes: string }
        Returns: {
          aplicou_maximo: boolean
          aplicou_minimo: boolean
          total_horas: number
          valor_bruto: number
          valor_final: number
          valor_hora_usado: number
        }[]
      }
      cancelar_lancamento_recorrente: {
        Args: { p_compra_id: string; p_data_fim?: string }
        Returns: boolean
      }
      check_my_permission: {
        Args: { p_escritorio_id: string; p_modulo: string; p_permissao: string }
        Returns: boolean
      }
      cleanup_expired_memories: { Args: never; Returns: number }
      clonar_produto_para_projeto: {
        Args: {
          p_cliente_id: string
          p_data_inicio?: string
          p_nome: string
          p_processo_id?: string
          p_produto_id: string
          p_responsavel_id: string
          p_valor_negociado?: number
        }
        Returns: string
      }
      complete_profile_onboarding: {
        Args: {
          p_avatar_url?: string
          p_oab_numero?: string
          p_oab_uf?: string
          p_telefone?: string
        }
        Returns: Json
      }
      consultivo_buscar_precedentes_similares: {
        Args: {
          p_area: string
          p_escritorio_id: string
          p_limit?: number
          p_palavras_chave: string[]
        }
        Returns: {
          id: string
          relevancia: number
          resumo: string
          titulo: string
        }[]
      }
      converter_alerta_em_receita: {
        Args: {
          p_alerta_id: string
          p_descricao: string
          p_user_id: string
          p_valor: number
        }
        Returns: string
      }
      converter_oportunidade_cliente: {
        Args: {
          p_etapa_ganho_id: string
          p_oportunidade_id: string
          p_user_id: string
          p_valor_fechado: number
        }
        Returns: boolean
      }
      create_atos_padrao_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: undefined
      }
      create_escritorio_onboarding: {
        Args: {
          p_cnpj?: string
          p_email?: string
          p_endereco?: Json
          p_nome: string
          p_telefone?: string
        }
        Returns: Json
      }
      create_pessoa: {
        Args: {
          p_cpf_cnpj?: string
          p_dados?: Json
          p_escritorio_id: string
          p_nome_completo: string
          p_tipo_contato: string
          p_tipo_pessoa: string
        }
        Returns: string
      }
      create_processo: { Args: { p_dados: Json }; Returns: Json }
      criar_alerta_cobranca: {
        Args: {
          p_ato_tipo_id: string
          p_processo_id: string
          p_tipo_alerta?: string
          p_valor_sugerido?: number
        }
        Returns: string
      }
      criar_alerta_cobranca_manual: {
        Args: {
          p_ato_tipo_id: string
          p_descricao?: string
          p_processo_id: string
          p_titulo?: string
          p_valor_sugerido?: number
        }
        Returns: string
      }
      criar_despesa_cartao: {
        Args: {
          p_cartao_id: string
          p_categoria: string
          p_comprovante_url?: string
          p_data_compra: string
          p_descricao: string
          p_documento_fiscal?: string
          p_escritorio_id: string
          p_fornecedor?: string
          p_hash?: string
          p_importado?: boolean
          p_numero_parcelas: number
          p_processo_id?: string
          p_valor_total: number
        }
        Returns: string
      }
      criar_escritorio: {
        Args: { p_cnpj?: string; p_nome: string }
        Returns: string
      }
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
      criar_lancamento_cartao:
        | {
            Args: {
              p_cartao_id: string
              p_categoria: string
              p_data_compra?: string
              p_descricao: string
              p_documento_fiscal?: string
              p_fornecedor?: string
              p_importado_de_fatura?: boolean
              p_mes_referencia?: string
              p_observacoes?: string
              p_parcelas?: number
              p_processo_id?: string
              p_tipo?: string
              p_valor?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_cartao_id: string
              p_categoria: string
              p_data_compra?: string
              p_descricao: string
              p_documento_fiscal?: string
              p_fornecedor?: string
              p_importado_de_fatura?: boolean
              p_observacoes?: string
              p_parcelas?: number
              p_processo_id?: string
              p_tipo?: string
              p_valor?: number
            }
            Returns: string
          }
      criar_prazo_de_publicacao: {
        Args: { p_dados: Json; p_publicacao_id: string }
        Returns: string
      }
      criar_receita:
        | {
            Args: {
              p_categoria?: string
              p_cliente_id: string
              p_contrato_id?: string
              p_created_by?: string
              p_data_vencimento: string
              p_descricao: string
              p_escritorio_id: string
              p_numero_parcelas?: number
              p_parcelado?: boolean
              p_processo_id?: string
              p_valor: number
            }
            Returns: string
          }
        | {
            Args: {
              p_categoria: Database["public"]["Enums"]["receita_categoria_enum"]
              p_cliente_id: string
              p_contrato_id: string
              p_created_by?: string
              p_data_vencimento: string
              p_descricao: string
              p_escritorio_id: string
              p_numero_parcelas?: number
              p_parcelado?: boolean
              p_processo_id: string
              p_valor: number
            }
            Returns: string
          }
      criar_versao_produto: {
        Args: { p_alteracoes?: string; p_motivo?: string; p_produto_id: string }
        Returns: number
      }
      decay_memory_relevance: { Args: never; Returns: number }
      desaprovar_timesheet: {
        Args: { p_desaprovado_por?: string; p_timesheet_ids: string[] }
        Returns: undefined
      }
      descartar_publicacao: {
        Args: { p_motivo: string; p_publicacao_id: string }
        Returns: boolean
      }
      descartar_timer: { Args: { p_timer_id: string }; Returns: boolean }
      desmanchar_fatura: {
        Args: { p_fatura_id: string; p_user_id?: string }
        Returns: boolean
      }
      dividir_timesheet: {
        Args: { p_divisoes: Json; p_timesheet_id: string }
        Returns: string[]
      }
      editar_timesheet: {
        Args: {
          p_atividade: string
          p_editado_por: string
          p_faturavel: boolean
          p_horas: number
          p_timesheet_id: string
        }
        Returns: undefined
      }
      encerrar_contrato_limite: {
        Args: { p_contrato_id: string; p_user_id: string }
        Returns: boolean
      }
      escritorios_mesmo_grupo: {
        Args: { p_escritorio_id_1: string; p_escritorio_id_2: string }
        Returns: boolean
      }
      excluir_lancamento_cartao: {
        Args: { p_lancamento_id: string }
        Returns: boolean
      }
      executar_fechamento_mensal_pasta: {
        Args: { p_competencia?: string }
        Returns: Json
      }
      execute_raw_sql: { Args: { sql_query: string }; Returns: Json }
      execute_safe_delete: {
        Args: {
          confirmacao_dupla?: boolean
          escritorio_param: string
          registro_id: string
          tabela: string
        }
        Returns: Json
      }
      execute_safe_insert: {
        Args: { dados: Json; escritorio_param: string; tabela: string }
        Returns: Json
      }
      execute_safe_query: {
        Args: { escritorio_param: string; query_text: string }
        Returns: Json
      }
      execute_safe_update: {
        Args: {
          alteracoes: Json
          escritorio_param: string
          registro_id: string
          tabela: string
        }
        Returns: Json
      }
      extrair_numero_cnj: { Args: { texto: string }; Returns: string }
      fechar_fatura_cartao:
        | {
            Args: { p_cartao_id: string; p_mes_referencia: string }
            Returns: string
          }
        | { Args: { p_fatura_id: string }; Returns: string }
      finalizar_ato_hora: {
        Args: {
          p_ato_tipo_id: string
          p_processo_id: string
          p_user_id?: string
        }
        Returns: {
          aplicou_minimo: boolean
          horas_cobradas: number
          horas_trabalhadas: number
          mensagem: string
          receita_id: string
          valor_total: number
        }[]
      }
      finalizar_timer: {
        Args: {
          p_ajuste_minutos?: number
          p_descricao?: string
          p_timer_id: string
        }
        Returns: string
      }
      find_cliente_id: {
        Args: { p_escritorio_id: string; p_nome: string }
        Returns: string
      }
      finish_onboarding: { Args: never; Returns: Json }
      gerar_codigo_portfolio: {
        Args: { p_area?: string; p_escritorio_id: string; p_tipo: string }
        Returns: string
      }
      gerar_fatura_v2: {
        Args: {
          p_cliente_id: string
          p_data_emissao?: string
          p_data_vencimento?: string
          p_escritorio_id: string
          p_honorarios_ids?: string[]
          p_observacoes?: string
          p_timesheet_ids?: string[]
          p_user_id?: string
        }
        Returns: string
      }
      gerar_fatura_v3:
        | {
            Args: {
              p_cliente_id: string
              p_data_emissao: string
              p_data_vencimento?: string
              p_escritorio_id: string
              p_fechamentos_ids?: string[]
              p_honorarios_ids?: string[]
              p_observacoes?: string
              p_timesheet_ids?: string[]
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_cliente_id: string
              p_data_emissao?: string
              p_data_vencimento?: string
              p_escritorio_id: string
              p_fechamentos_ids?: string[]
              p_honorarios_ids?: string[]
              p_observacoes?: string
              p_timesheet_ids?: string[]
              p_user_id?: string
            }
            Returns: string
          }
      gerar_lancamentos_recorrentes:
        | { Args: never; Returns: number }
        | {
            Args: { p_cartao_id: string; p_mes_referencia: string }
            Returns: number
          }
      gerar_numero_modulo: {
        Args: { p_escritorio_id: string; p_modulo: string; p_prefixo: string }
        Returns: string
      }
      gerar_numero_pasta_unificado: {
        Args: { p_escritorio_id: string }
        Returns: string
      }
      get_agenda_consultivo: {
        Args: { p_consultivo_id: string }
        Returns: {
          consultivo_id: string
          consultivo_titulo: string
          cor: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string
          dia_inteiro: boolean
          escritorio_id: string
          id: string
          local: string
          prazo_cumprido: boolean
          prazo_data_limite: string
          prazo_tipo: string
          prioridade: string
          processo_id: string
          processo_numero: string
          recorrencia_id: string
          responsavel_id: string
          responsavel_nome: string
          status: string
          subtipo: string
          tipo_entidade: string
          titulo: string
          updated_at: string
        }[]
      }
      get_agenda_processo: {
        Args: { p_processo_id: string }
        Returns: {
          consultivo_id: string
          consultivo_titulo: string
          cor: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string
          dia_inteiro: boolean
          escritorio_id: string
          id: string
          local: string
          prazo_cumprido: boolean
          prazo_data_limite: string
          prazo_tipo: string
          prioridade: string
          processo_id: string
          processo_numero: string
          recorrencia_id: string
          responsaveis_nomes: string[]
          responsavel_id: string
          responsavel_nome: string
          status: string
          subtipo: string
          tipo_entidade: string
          titulo: string
          updated_at: string
        }[]
      }
      get_ato_config_hora: {
        Args: { p_ato_tipo_id: string; p_contrato_id: string }
        Returns: Json
      }
      get_audiencia_escritorio_id: {
        Args: { p_audiencia_id: string }
        Returns: string
      }
      get_audiencia_responsaveis_nomes: {
        Args: { p_audiencia_id: string }
        Returns: string
      }
      get_cached_embedding: { Args: { p_input_hash: string }; Returns: string }
      get_colleague_user_ids: { Args: never; Returns: string[] }
      get_enum_values: { Args: { tipo_nome: string }; Returns: Json }
      get_escritorio_ativo: { Args: { user_uuid: string }; Returns: string }
      get_escritorios_do_grupo: {
        Args: { p_escritorio_id: string }
        Returns: {
          ativo: boolean
          cnpj: string
          grupo_id: string
          id: string
          logo_url: string
          nome: string
          plano: string
        }[]
      }
      get_estatisticas_conversao_consultivo: {
        Args: {
          p_escritorio_id: string
          p_periodo_fim?: string
          p_periodo_inicio?: string
        }
        Returns: Json
      }
      get_evento_criado_por: { Args: { p_evento_id: string }; Returns: string }
      get_evento_escritorio_id: {
        Args: { p_evento_id: string }
        Returns: string
      }
      get_evento_responsaveis_nomes: {
        Args: { p_evento_id: string }
        Returns: string
      }
      get_extrato_com_recorrentes: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_escritorio_ids: string[]
        }
        Returns: {
          categoria: string
          cliente_id: string
          conta_bancaria_id: string
          conta_bancaria_nome: string
          data_efetivacao: string
          data_referencia: string
          data_vencimento: string
          descricao: string
          entidade: string
          escritorio_id: string
          id: string
          origem: string
          origem_id: string
          origem_pai_id: string
          processo_id: string
          status: string
          tipo_movimento: string
          valor: number
          valor_pago: number
          virtual: boolean
        }[]
      }
      get_faturas_geradas: {
        Args: { p_escritorio_id: string }
        Returns: {
          categoria_status: string
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_emissao: string
          data_vencimento: string
          dias_ate_vencimento: number
          enviada_em: string
          escritorio_id: string
          fatura_id: string
          gerada_automaticamente: boolean
          numero_fatura: string
          numero_parcelas: number
          observacoes: string
          paga_em: string
          parcelado: boolean
          pdf_url: string
          qtd_honorarios: number
          qtd_horas: number
          soma_horas: number
          status: string
          total_honorarios: number
          total_horas: number
          updated_at: string
          valor_total: number
        }[]
      }
      get_grupo_id_ativo: { Args: never; Returns: string }
      get_horas_acumuladas_ato: {
        Args: { p_ato_tipo_id: string; p_processo_id: string }
        Returns: {
          atingiu_maximo: boolean
          horas_disponiveis: number
          horas_excedentes: number
          horas_faturaveis: number
          horas_totais: number
          percentual_usado: number
          status: string
          valor_atual: number
          valor_maximo: number
          valor_minimo: number
        }[]
      }
      get_lancamentos_prontos_faturar: {
        Args: { p_escritorio_id: string }
        Returns: {
          categoria: string
          cliente_id: string
          cliente_nome: string
          consulta_id: string
          created_at: string
          descricao: string
          escritorio_id: string
          horas: number
          lancamento_id: string
          processo_id: string
          tipo_lancamento: string
          valor: number
        }[]
      }
      get_my_permissions: {
        Args: { p_escritorio_id: string }
        Returns: {
          modulo: string
          pode_criar: boolean
          pode_editar: boolean
          pode_excluir: boolean
          pode_exportar: boolean
          pode_visualizar: boolean
        }[]
      }
      get_portfolio_dashboard_metricas: {
        Args: { p_escritorio_id: string }
        Returns: {
          projetos_atrasados: number
          receita_mes_anterior: number
          receita_mes_atual: number
          taxa_sucesso_geral: number
          total_produtos_ativos: number
          total_projetos_ativos: number
        }[]
      }
      get_publicacao_completa: {
        Args: { p_publicacao_id: string }
        Returns: Json
      }
      get_responsaveis_nomes_from_array: {
        Args: { p_ids: string[] }
        Returns: string
      }
      get_tabelas_permitidas: { Args: never; Returns: string[] }
      get_table_info: { Args: { tabela_nome: string }; Returns: Json }
      get_table_schema: { Args: { tabela_nome: string }; Returns: Json }
      get_tarefa_escritorio_id: {
        Args: { p_tarefa_id: string }
        Returns: string
      }
      get_tarefa_faturavel: { Args: { p_tarefa_id: string }; Returns: boolean }
      get_tarefa_responsaveis_nomes: {
        Args: { p_tarefa_id: string }
        Returns: string
      }
      get_tempo_na_etapa: {
        Args: { oportunidade_id: string }
        Returns: unknown
      }
      get_ultima_interacao: {
        Args: { p_pessoa_id: string }
        Returns: {
          assunto: string
          data_hora: string
          tipo: string
          user_nome: string
        }[]
      }
      get_user_escritorios: {
        Args: { user_uuid: string }
        Returns: {
          escritorio_id: string
          escritorio_nome: string
          is_owner: boolean
          role: string
          ultimo_acesso: string
        }[]
      }
      get_user_grupo_ids: { Args: never; Returns: string[] }
      get_valor_hora_contrato: {
        Args: { p_contrato_id: string }
        Returns: number
      }
      get_valor_hora_efetivo: {
        Args: { p_contrato_id: string; p_user_id: string }
        Returns: number
      }
      has_permission: {
        Args: {
          p_escritorio_id: string
          p_modulo: string
          p_permissao: string
          p_user_id: string
        }
        Returns: boolean
      }
      ignorar_alerta_cobranca: {
        Args: {
          p_alerta_id: string
          p_justificativa?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      importar_indice_bcb: {
        Args: {
          p_codigo_bcb: number
          p_competencia: string
          p_nome: string
          p_valor: number
          p_variacao_mensal?: number
        }
        Returns: Json
      }
      iniciar_timer:
        | {
            Args: {
              p_audiencia_id?: string
              p_consulta_id?: string
              p_descricao?: string
              p_escritorio_id: string
              p_evento_id?: string
              p_faturavel?: boolean
              p_processo_id?: string
              p_tarefa_id?: string
              p_titulo: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_consulta_id?: string
              p_descricao?: string
              p_escritorio_id: string
              p_faturavel?: boolean
              p_processo_id?: string
              p_tarefa_id?: string
              p_titulo: string
              p_user_id: string
            }
            Returns: string
          }
      is_dono_or_socio: { Args: { p_escritorio_id: string }; Returns: boolean }
      is_dono_or_socio_direct: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      limpar_cache_datajud_expirado: { Args: never; Returns: number }
      limpar_escavador_cache_expirado: { Args: never; Returns: number }
      limpar_faturas_storage_antigas: {
        Args: never
        Returns: {
          arquivos_removidos: number
          registros_atualizados: number
        }[]
      }
      limpar_migracao_temp: { Args: never; Returns: undefined }
      marcar_alerta_cobrado: {
        Args: { p_alerta_id: string; p_honorario_id?: string }
        Returns: boolean
      }
      marcar_fechamento_faturado: {
        Args: { p_fatura_id: string; p_fechamento_id: string }
        Returns: boolean
      }
      mover_oportunidade_etapa: {
        Args: {
          p_nova_etapa_id: string
          p_observacao?: string
          p_oportunidade_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      obter_codigo_bcb: { Args: { p_nome_indice: string }; Returns: number }
      obter_dashboard_mes: {
        Args: { p_ano: number; p_mes: number; p_user_id: string }
        Returns: Json
      }
      obter_fatura_atual_cartao: {
        Args: { p_cartao_id: string }
        Returns: {
          data_fechamento: string
          data_vencimento: string
          dias_para_fechamento: number
          dias_para_vencimento: number
          fatura_id: string
          mes_referencia: string
          status: string
          total_lancamentos: number
          valor_total: number
        }[]
      }
      obter_indice_padrao_processo: {
        Args: { p_area: string }
        Returns: string
      }
      obter_lancamentos_mes: {
        Args: { p_cartao_id: string; p_mes_referencia: string }
        Returns: {
          categoria: string
          compra_id: string
          data_compra: string
          descricao: string
          fatura_id: string
          faturado: boolean
          fornecedor: string
          id: string
          mes_referencia: string
          parcela_numero: number
          parcela_total: number
          recorrente_ativo: boolean
          recorrente_data_fim: string
          tipo: string
          valor: number
        }[]
      }
      obter_ou_criar_fatura_cartao: {
        Args: { p_cartao_id: string; p_mes_referencia: string }
        Returns: string
      }
      pagar_fatura: {
        Args: {
          p_comprovante_url?: string
          p_conta_bancaria_id?: string
          p_data_pagamento: string
          p_fatura_id: string
          p_forma_pagamento: string
          p_observacoes?: string
          p_user_id?: string
          p_valor_pago: number
        }
        Returns: string
      }
      pausar_timer: { Args: { p_timer_id: string }; Returns: boolean }
      pecas_gerar_numero_interno: {
        Args: { p_escritorio_id: string }
        Returns: string
      }
      processar_recorrencias_diarias: { Args: never; Returns: number }
      reativar_lancamento_recorrente: {
        Args: { p_compra_id: string }
        Returns: boolean
      }
      receber_receita: {
        Args: {
          p_conta_bancaria_id?: string
          p_data_pagamento?: string
          p_forma_pagamento?: Database["public"]["Enums"]["forma_pagamento_enum"]
          p_receita_id: string
          p_valor_pago?: number
        }
        Returns: boolean
      }
      receber_receita_parcial: {
        Args: {
          p_conta_bancaria_id: string
          p_forma_pagamento: Database["public"]["Enums"]["forma_pagamento_enum"]
          p_nova_data_vencimento: string
          p_receita_id: string
          p_valor_pago: number
        }
        Returns: string
      }
      registrar_andamento_publicacao: {
        Args: {
          p_notificar_cliente?: boolean
          p_publicacao_id: string
          p_resumo: string
        }
        Returns: string
      }
      registrar_interacao: {
        Args: {
          p_assunto: string
          p_dados?: Json
          p_descricao: string
          p_pessoa_id: string
          p_tipo: string
          p_user_id: string
        }
        Returns: string
      }
      registrar_tempo_retroativo: {
        Args: {
          p_atividade?: string
          p_ato_tipo_id?: string
          p_audiencia_id?: string
          p_consulta_id?: string
          p_data_trabalho: string
          p_escritorio_id: string
          p_evento_id?: string
          p_faturavel?: boolean
          p_faturavel_manual?: boolean
          p_hora_fim?: string
          p_hora_inicio?: string
          p_horas?: number
          p_processo_id?: string
          p_tarefa_id?: string
          p_user_id: string
        }
        Returns: string
      }
      remover_processo_fechamento: {
        Args: { p_fechamento_id: string; p_processo_id: string }
        Returns: boolean
      }
      renovar_contrato_pasta: {
        Args: {
          p_contrato_id: string
          p_novo_limite?: number
          p_user_id: string
        }
        Returns: boolean
      }
      reprovar_timesheet: {
        Args: {
          p_justificativa: string
          p_reprovado_por: string
          p_timesheet_ids: string[]
        }
        Returns: number
      }
      resetar_creditos_escavador: { Args: never; Returns: number }
      retomar_timer: { Args: { p_timer_id: string }; Returns: boolean }
      sanitize_name: { Args: { input_text: string }; Returns: string }
      search_knowledge_base: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          id: string
          metadata: Json
          similarity: number
          source: string
          title: string
        }[]
      }
      search_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_escritorio_id: string
          p_sessao_id?: string
          p_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          content_resumido: string
          entidade: string
          id: string
          relevancia_score: number
          similarity: number
          tipo: string
        }[]
      }
      search_similar_feedback: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_escritorio_id: string
          query_embedding: string
        }
        Returns: {
          created_at: string
          id: string
          similarity: number
          tipo_feedback: string
          user_message: string
        }[]
      }
      seed_cargo_permissoes: {
        Args: { p_cargo_id: string; p_cargo_nome: string }
        Returns: undefined
      }
      seed_cargos_for_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: undefined
      }
      seed_default_cargos: {
        Args: { p_escritorio_id: string }
        Returns: undefined
      }
      seed_default_tags_for_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: undefined
      }
      set_escritorio_ativo: {
        Args: { escritorio_uuid: string; user_uuid: string }
        Returns: boolean
      }
      title_case_smart: { Args: { input_text: string }; Returns: string }
      toggle_faturavel_timesheet: {
        Args: {
          p_alterado_por: string
          p_faturavel: boolean
          p_timesheet_ids: string[]
        }
        Returns: number
      }
      transformar_consultivo_em_processo: {
        Args: {
          p_arquivar_consultivo?: boolean
          p_comarca?: string
          p_consultivo_id: string
          p_data_distribuicao?: string
          p_fase?: string
          p_instancia?: string
          p_manter_contrato?: boolean
          p_migrar_andamentos?: boolean
          p_numero_cnj?: string
          p_parte_contraria?: string
          p_polo_cliente?: string
          p_tipo?: string
          p_tribunal?: string
          p_uf?: string
          p_valor_causa?: number
          p_vara?: string
        }
        Returns: Json
      }
      trigger_publicacoes_sync_auto: { Args: never; Returns: undefined }
      update_embedding_cache_usage: {
        Args: { p_input_hash: string }
        Returns: undefined
      }
      update_memory_usage: {
        Args: { memory_ids: string[] }
        Returns: undefined
      }
      user_belongs_to_escritorio:
        | { Args: { p_escritorio_id: string }; Returns: boolean }
        | {
            Args: { escritorio_uuid: string; user_uuid: string }
            Returns: boolean
          }
      user_can_access_alerta: { Args: { alerta_id: string }; Returns: boolean }
      user_has_access_to_conta_bancaria: {
        Args: { p_conta_id: string }
        Returns: boolean
      }
      user_has_access_to_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_has_access_to_escritorio_relatorios: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_has_access_to_grupo: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_has_access_to_peca: { Args: { p_peca_id: string }; Returns: boolean }
      user_has_access_to_publicacao: {
        Args: { p_publicacao_id: string }
        Returns: boolean
      }
      user_has_access_to_template: {
        Args: { p_template_id: string }
        Returns: boolean
      }
      user_in_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_pode_editar_processo: {
        Args: { p_processo_id: string }
        Returns: boolean
      }
      user_pode_gerenciar_financeiro: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_tem_acesso_documento: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_tem_acesso_escritorio: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_tem_acesso_escritorio_portfolio: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      user_tem_acesso_movimentacao: {
        Args: { p_processo_id: string }
        Returns: boolean
      }
      user_tem_acesso_permissao: {
        Args: { p_usuario_escritorio_id: string }
        Returns: boolean
      }
      user_tem_acesso_processo: {
        Args: { p_processo_id: string }
        Returns: boolean
      }
      user_tem_acesso_processo_direto: {
        Args: { p_escritorio_id: string }
        Returns: boolean
      }
      verificar_limites_contratos_pasta: { Args: never; Returns: Json }
      vincular_processo_auto: {
        Args: { p_publicacao_id: string }
        Returns: string
      }
    }
    Enums: {
      area_juridica_enum:
        | "civel"
        | "trabalhista"
        | "criminal"
        | "tributario"
        | "empresarial"
        | "familia"
        | "consumidor"
        | "previdenciario"
        | "administrativo"
        | "outros"
        | "ambiental"
      despesa_categoria_enum:
        | "custas"
        | "cartorio"
        | "oficial_justica"
        | "correios"
        | "copia"
        | "publicacao"
        | "certidao"
        | "protesto"
        | "honorarios_perito"
        | "fornecedor"
        | "material"
        | "tecnologia"
        | "assinatura"
        | "aluguel"
        | "telefonia"
        | "folha"
        | "prolabore"
        | "retirada_socios"
        | "beneficios"
        | "impostos"
        | "taxas_bancarias"
        | "combustivel"
        | "deslocamento"
        | "estacionamento"
        | "hospedagem"
        | "viagem"
        | "alimentacao"
        | "marketing"
        | "capacitacao"
        | "associacoes"
        | "emprestimos"
        | "juros"
        | "cartao_credito"
        | "comissao"
        | "outra"
        | "outros"
      despesa_status_enum: "pendente" | "pago" | "cancelado"
      etapa_oportunidade_enum:
        | "lead"
        | "contato_feito"
        | "proposta_enviada"
        | "negociacao"
        | "ganho"
        | "perdido"
      forma_pagamento_enum:
        | "dinheiro"
        | "pix"
        | "ted"
        | "boleto"
        | "cartao_credito"
        | "cartao_debito"
        | "cheque"
        | "deposito"
      motivo_perda_enum:
        | "preco"
        | "concorrencia"
        | "desistencia"
        | "sem_resposta"
        | "fora_escopo"
        | "outros"
      nivel_prioridade: "baixa" | "media" | "alta" | "urgente"
      origem_crm_enum:
        | "indicacao"
        | "site"
        | "google"
        | "redes_sociais"
        | "evento"
        | "parceria"
        | "outros"
      receita_categoria_enum:
        | "honorarios"
        | "custas_reembolsadas"
        | "exito"
        | "consultoria"
        | "outros"
      receita_status_enum:
        | "pendente"
        | "pago"
        | "parcial"
        | "atrasado"
        | "cancelado"
        | "faturado"
      receita_tipo_enum:
        | "honorario"
        | "parcela"
        | "avulso"
        | "saldo"
        | "reembolso"
      status_consultivo: "ativo" | "arquivado"
      status_pessoa_enum: "ativo" | "inativo" | "arquivado"
      status_projeto:
        | "planejamento"
        | "ativo"
        | "pausado"
        | "revisao"
        | "concluido"
      status_tarefa: "backlog" | "em_andamento" | "revisao" | "concluida"
      tipo_cadastro_enum:
        | "cliente"
        | "prospecto"
        | "parte_contraria"
        | "correspondente"
        | "testemunha"
        | "perito"
        | "juiz"
        | "promotor"
        | "outros"
      tipo_pessoa_enum: "pf" | "pj"
      uf_enum:
        | "AC"
        | "AL"
        | "AM"
        | "AP"
        | "BA"
        | "CE"
        | "DF"
        | "ES"
        | "GO"
        | "MA"
        | "MG"
        | "MS"
        | "MT"
        | "PA"
        | "PB"
        | "PE"
        | "PI"
        | "PR"
        | "RJ"
        | "RN"
        | "RO"
        | "RR"
        | "RS"
        | "SC"
        | "SE"
        | "SP"
        | "TO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      area_juridica_enum: [
        "civel",
        "trabalhista",
        "criminal",
        "tributario",
        "empresarial",
        "familia",
        "consumidor",
        "previdenciario",
        "administrativo",
        "outros",
        "ambiental",
      ],
      despesa_categoria_enum: [
        "custas",
        "cartorio",
        "oficial_justica",
        "correios",
        "copia",
        "publicacao",
        "certidao",
        "protesto",
        "honorarios_perito",
        "fornecedor",
        "material",
        "tecnologia",
        "assinatura",
        "aluguel",
        "telefonia",
        "folha",
        "prolabore",
        "retirada_socios",
        "beneficios",
        "impostos",
        "taxas_bancarias",
        "combustivel",
        "deslocamento",
        "estacionamento",
        "hospedagem",
        "viagem",
        "alimentacao",
        "marketing",
        "capacitacao",
        "associacoes",
        "emprestimos",
        "juros",
        "cartao_credito",
        "comissao",
        "outra",
        "outros",
      ],
      despesa_status_enum: ["pendente", "pago", "cancelado"],
      etapa_oportunidade_enum: [
        "lead",
        "contato_feito",
        "proposta_enviada",
        "negociacao",
        "ganho",
        "perdido",
      ],
      forma_pagamento_enum: [
        "dinheiro",
        "pix",
        "ted",
        "boleto",
        "cartao_credito",
        "cartao_debito",
        "cheque",
        "deposito",
      ],
      motivo_perda_enum: [
        "preco",
        "concorrencia",
        "desistencia",
        "sem_resposta",
        "fora_escopo",
        "outros",
      ],
      nivel_prioridade: ["baixa", "media", "alta", "urgente"],
      origem_crm_enum: [
        "indicacao",
        "site",
        "google",
        "redes_sociais",
        "evento",
        "parceria",
        "outros",
      ],
      receita_categoria_enum: [
        "honorarios",
        "custas_reembolsadas",
        "exito",
        "consultoria",
        "outros",
      ],
      receita_status_enum: [
        "pendente",
        "pago",
        "parcial",
        "atrasado",
        "cancelado",
        "faturado",
      ],
      receita_tipo_enum: [
        "honorario",
        "parcela",
        "avulso",
        "saldo",
        "reembolso",
      ],
      status_consultivo: ["ativo", "arquivado"],
      status_pessoa_enum: ["ativo", "inativo", "arquivado"],
      status_projeto: [
        "planejamento",
        "ativo",
        "pausado",
        "revisao",
        "concluido",
      ],
      status_tarefa: ["backlog", "em_andamento", "revisao", "concluida"],
      tipo_cadastro_enum: [
        "cliente",
        "prospecto",
        "parte_contraria",
        "correspondente",
        "testemunha",
        "perito",
        "juiz",
        "promotor",
        "outros",
      ],
      tipo_pessoa_enum: ["pf", "pj"],
      uf_enum: [
        "AC",
        "AL",
        "AM",
        "AP",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MG",
        "MS",
        "MT",
        "PA",
        "PB",
        "PE",
        "PI",
        "PR",
        "RJ",
        "RN",
        "RO",
        "RR",
        "RS",
        "SC",
        "SE",
        "SP",
        "TO",
      ],
    },
  },
} as const
