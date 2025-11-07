// =====================================================
// TIPOS DO MÓDULO CRM
// =====================================================

export type TipoPessoa = 'pf' | 'pj';
export type TipoContato = 'cliente' | 'parte_contraria' | 'correspondente' | 'testemunha' | 'perito' | 'juiz' | 'promotor' | 'outros';
export type StatusPessoa = 'ativo' | 'inativo' | 'prospecto' | 'arquivado';
export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';

export type TipoEtapa = 'em_andamento' | 'ganho' | 'perdido';
export type ResultadoOportunidade = 'ganho' | 'perdido' | 'cancelado';

export type TipoInteracao = 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'visita' | 'videochamada' | 'mensagem' | 'outros';
export type TipoAtividade = 'nota' | 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'proposta_enviada' | 'contrato_enviado' | 'mudanca_etapa' | 'alteracao_valor' | 'outros';
export type TipoRelacionamento = 'socio' | 'procurador' | 'representante_legal' | 'conjuge' | 'parente' | 'filial' | 'matriz' | 'contador' | 'fornecedor' | 'parceiro' | 'outros';

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

export interface Pessoa {
  id: string;
  escritorio_id: string;
  tipo_pessoa: TipoPessoa;
  tipo_contato: TipoContato;
  nome_completo: string;
  nome_fantasia?: string | null;
  cpf_cnpj?: string | null;
  rg_ie?: string | null;
  data_nascimento?: string | null;
  nacionalidade?: string | null;
  estado_civil?: EstadoCivil | null;
  profissao?: string | null;

  // Contatos
  telefone_principal?: string | null;
  telefone_secundario?: string | null;
  celular?: string | null;
  email_principal?: string | null;
  email_secundario?: string | null;
  whatsapp?: string | null;

  // Endereço
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;

  // CRM
  status: StatusPessoa;
  origem?: string | null;
  responsavel_id?: string | null;
  observacoes?: string | null;
  tags?: string[] | null;

  // Metadados
  created_at: string;
  updated_at: string;
  inativado_em?: string | null;
  motivo_inativacao?: string | null;
}

export interface PessoaResumo extends Pessoa {
  responsavel_nome?: string | null;
  responsavel_avatar?: string | null;
  total_processos: number;
  processos_ativos: number;
  total_honorarios: number;
  honorarios_pendentes: number;
  honorarios_pagos: number;
  ultima_interacao_data?: string | null;
  ultima_interacao_tipo?: TipoInteracao | null;
  dias_sem_contato?: number | null;
  total_interacoes: number;
  follow_ups_pendentes: number;
  oportunidades_ativas: number;
  total_relacionamentos: number;
}

export interface FunilEtapa {
  id: string;
  escritorio_id: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  cor: string;
  ativo: boolean;
  tipo: TipoEtapa;
  created_at: string;
  updated_at: string;
}

export interface Oportunidade {
  id: string;
  escritorio_id: string;
  pessoa_id: string;
  titulo: string;
  descricao?: string | null;
  valor_estimado?: number | null;
  probabilidade?: number | null;
  etapa_id: string;
  responsavel_id: string;
  origem?: string | null;
  indicado_por?: string | null;
  area_juridica?: string | null;
  tags?: string[] | null;
  data_abertura: string;
  data_prevista_fechamento?: string | null;
  data_fechamento?: string | null;
  resultado?: ResultadoOportunidade | null;
  motivo_perda?: string | null;
  valor_fechado?: number | null;
  created_at: string;
  updated_at: string;
}

export interface OportunidadeComDados extends Oportunidade {
  pessoa_nome: string;
  pessoa_tipo_pessoa: TipoPessoa;
  etapa_nome: string;
  etapa_cor: string;
  etapa_tipo: TipoEtapa;
  responsavel_nome: string;
  tempo_na_etapa_dias?: number;
  total_atividades: number;
}

export interface OportunidadeAtividade {
  id: string;
  oportunidade_id: string;
  user_id: string;
  tipo: TipoAtividade;
  titulo?: string | null;
  descricao: string;
  dados_extras?: Record<string, any> | null;
  data_hora: string;
  created_at: string;
}

export interface OportunidadeAtividadeComUsuario extends OportunidadeAtividade {
  user_nome: string;
  user_avatar?: string | null;
}

export interface Interacao {
  id: string;
  pessoa_id: string;
  user_id: string;
  tipo: TipoInteracao;
  assunto: string;
  descricao: string;
  data_hora: string;
  duracao_minutos?: number | null;
  resultado?: string | null;
  participantes?: string[] | null;
  follow_up: boolean;
  follow_up_data?: string | null;
  follow_up_descricao?: string | null;
  follow_up_concluido: boolean;
  follow_up_concluido_em?: string | null;
  processo_id?: string | null;
  oportunidade_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteracaoComUsuario extends Interacao {
  user_nome: string;
  user_avatar?: string | null;
}

export interface InteracaoAnexo {
  id: string;
  interacao_id: string;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tipo: string;
  arquivo_tamanho: number;
  created_at: string;
}

export interface Relacionamento {
  id: string;
  pessoa_origem_id: string;
  pessoa_destino_id: string;
  tipo_relacionamento: TipoRelacionamento;
  descricao?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export interface RelacionamentoCompleto extends Relacionamento {
  pessoa_relacionada_nome: string;
  pessoa_relacionada_tipo: TipoPessoa;
  pessoa_relacionada_tipo_contato: TipoContato;
  direcao: 'origem' | 'destino';
}

// =====================================================
// TIPOS PARA FORMULÁRIOS
// =====================================================

export interface PessoaFormData {
  tipo_pessoa: TipoPessoa;
  tipo_contato: TipoContato;
  nome_completo: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg_ie?: string;
  data_nascimento?: string;
  nacionalidade?: string;
  estado_civil?: EstadoCivil;
  profissao?: string;
  telefone_principal?: string;
  telefone_secundario?: string;
  celular?: string;
  email_principal?: string;
  email_secundario?: string;
  whatsapp?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  status: StatusPessoa;
  origem?: string;
  responsavel_id?: string;
  observacoes?: string;
  tags?: string[];
}

export interface OportunidadeFormData {
  pessoa_id: string;
  titulo: string;
  descricao?: string;
  valor_estimado?: number;
  probabilidade?: number;
  etapa_id: string;
  responsavel_id: string;
  origem?: string;
  indicado_por?: string;
  area_juridica?: string;
  tags?: string[];
  data_abertura: string;
  data_prevista_fechamento?: string;
}

export interface InteracaoFormData {
  pessoa_id: string;
  tipo: TipoInteracao;
  assunto: string;
  descricao: string;
  data_hora?: string;
  duracao_minutos?: number;
  resultado?: string;
  participantes?: string[];
  follow_up?: boolean;
  follow_up_data?: string;
  follow_up_descricao?: string;
  processo_id?: string;
  oportunidade_id?: string;
}

// =====================================================
// TIPOS PARA FILTROS E ORDENAÇÃO
// =====================================================

export interface PessoasFiltros {
  tipo_pessoa?: TipoPessoa[];
  tipo_contato?: TipoContato[];
  status?: StatusPessoa[];
  responsavel_id?: string[];
  origem?: string[];
  tags?: string[];
  busca?: string;
}

export interface OportunidadesFiltros {
  etapa_id?: string[];
  responsavel_id?: string[];
  area_juridica?: string[];
  origem?: string[];
  tags?: string[];
  valor_min?: number;
  valor_max?: number;
  probabilidade_min?: number;
  busca?: string;
}

export type OrdenacaoPessoas = 'nome_asc' | 'nome_desc' | 'created_at_asc' | 'created_at_desc' | 'ultima_interacao_asc' | 'ultima_interacao_desc';
export type OrdenacaoOportunidades = 'valor_desc' | 'valor_asc' | 'probabilidade_desc' | 'probabilidade_asc' | 'data_abertura_desc' | 'data_abertura_asc';

// =====================================================
// TIPOS PARA MÉTRICAS E DASHBOARDS
// =====================================================

export interface FunilMetricas {
  etapa_id: string;
  etapa_nome: string;
  etapa_ordem: number;
  etapa_cor: string;
  etapa_tipo: TipoEtapa;
  total_oportunidades: number;
  valor_total: number;
  valor_medio: number;
  probabilidade_media: number;
  tempo_medio_dias?: number;
}

export interface CRMMetricas {
  total_pessoas: number;
  total_clientes: number;
  total_leads: number;
  total_oportunidades_ativas: number;
  valor_total_pipeline: number;
  taxa_conversao: number;
  interacoes_ultima_semana: number;
  follow_ups_pendentes: number;
}
