// =====================================================
// TIPOS DO MÓDULO CRM (Atualizado para nova estrutura)
// =====================================================

// ENUMs do banco de dados
export type TipoPessoa = 'pf' | 'pj';
export type TipoCadastro = 'cliente' | 'prospecto' | 'parte_contraria' | 'correspondente' | 'testemunha' | 'perito' | 'juiz' | 'promotor' | 'outros';
export type StatusPessoa = 'ativo' | 'inativo' | 'arquivado';
export type OrigemCRM = 'indicacao' | 'site' | 'google' | 'redes_sociais' | 'evento' | 'parceria' | 'outros';
export type EtapaOportunidade = 'lead' | 'contato_feito' | 'proposta_enviada' | 'negociacao' | 'ganho' | 'perdido';
export type AreaJuridica = 'civel' | 'trabalhista' | 'criminal' | 'tributario' | 'empresarial' | 'familia' | 'consumidor' | 'previdenciario' | 'administrativo' | 'outros';
export type MotivoPerda = 'preco' | 'concorrencia' | 'desistencia' | 'sem_resposta' | 'fora_escopo' | 'outros';
export type UF = 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR' | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO';

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

export interface Pessoa {
  id: string;
  escritorio_id: string;
  tipo_pessoa: TipoPessoa;
  tipo_cadastro: TipoCadastro;
  nome_completo: string;
  nome_fantasia?: string | null;
  cpf_cnpj?: string | null;

  // Contato (unificado)
  telefone?: string | null;
  email?: string | null;

  // Endereço
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: UF | null;

  // CRM
  status: StatusPessoa;
  origem?: OrigemCRM | null;
  indicado_por?: string | null;
  observacoes?: string | null;
  tags?: string[] | null;

  // Metadados
  created_at: string;
  updated_at: string;
}

export interface PessoaResumo extends Pessoa {
  oportunidades_ativas?: number;
}

export interface Oportunidade {
  id: string;
  escritorio_id: string;
  pessoa_id: string;
  titulo: string;
  descricao?: string | null;
  valor_estimado?: number | null;
  valor_fechado?: number | null;
  probabilidade?: number | null;
  etapa: EtapaOportunidade;
  responsavel_id: string;
  origem?: OrigemCRM | null;
  indicado_por?: string | null;
  area_juridica?: AreaJuridica | null;
  motivo_perda?: MotivoPerda | null;
  tags?: string[] | null;
  interacoes?: InteracaoJSONB[] | null;
  data_abertura: string;
  data_prevista_fechamento?: string | null;
  data_fechamento?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OportunidadeComDados extends Oportunidade {
  pessoa_nome: string;
  pessoa_tipo_pessoa: TipoPessoa;
  responsavel_nome: string;
}

// Estrutura de interação no JSONB
export interface InteracaoJSONB {
  id: string;
  tipo: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'visita' | 'videochamada' | 'proposta_enviada' | 'contrato_enviado' | 'outros';
  data: string;
  descricao: string;
  user_id: string;
  user_nome?: string;
  etapa_anterior?: EtapaOportunidade;
  etapa_nova?: EtapaOportunidade;
  oportunidade_titulo?: string;
  pessoa_nome?: string;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS
// =====================================================

export interface PessoaFormData {
  tipo_pessoa: TipoPessoa;
  tipo_cadastro: TipoCadastro;
  nome_completo: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: UF;
  status: StatusPessoa;
  origem?: OrigemCRM;
  indicado_por?: string;
  observacoes?: string;
  tags?: string[];
}

export interface OportunidadeFormData {
  pessoa_id: string;
  titulo: string;
  descricao?: string;
  valor_estimado?: number;
  probabilidade?: number;
  etapa: EtapaOportunidade;
  responsavel_id: string;
  origem?: OrigemCRM;
  indicado_por?: string;
  area_juridica?: AreaJuridica;
  tags?: string[];
  data_abertura: string;
  data_prevista_fechamento?: string;
}

// =====================================================
// TIPOS PARA FILTROS E ORDENAÇÃO
// =====================================================

export interface PessoasFiltros {
  tipo_pessoa?: TipoPessoa[];
  tipo_cadastro?: TipoCadastro[];
  status?: StatusPessoa[];
  origem?: OrigemCRM[];
  tags?: string[];
  busca?: string;
}

export interface OportunidadesFiltros {
  etapa?: EtapaOportunidade[];
  responsavel_id?: string[];
  area_juridica?: AreaJuridica[];
  origem?: OrigemCRM[];
  tags?: string[];
  valor_min?: number;
  valor_max?: number;
  probabilidade_min?: number;
  busca?: string;
}

export type OrdenacaoPessoas = 'nome_asc' | 'nome_desc' | 'created_at_asc' | 'created_at_desc';
export type OrdenacaoOportunidades = 'valor_desc' | 'valor_asc' | 'probabilidade_desc' | 'probabilidade_asc' | 'data_abertura_desc' | 'data_abertura_asc';

// =====================================================
// TIPOS PARA MÉTRICAS E DASHBOARDS
// =====================================================

export interface FunilMetricas {
  etapa: EtapaOportunidade;
  etapa_label: string;
  total_oportunidades: number;
  valor_total: number;
  valor_medio: number;
  probabilidade_media: number;
}

export interface CRMMetricas {
  total_pessoas: number;
  total_clientes: number;
  total_prospectos: number;
  total_oportunidades_ativas: number;
  valor_total_pipeline: number;
  taxa_conversao: number;
}

// =====================================================
// HELPERS
// =====================================================

export const ETAPA_LABELS: Record<EtapaOportunidade, string> = {
  lead: 'Lead',
  contato_feito: 'Contato Feito',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export const ETAPA_COLORS: Record<EtapaOportunidade, string> = {
  lead: '#94a3b8',
  contato_feito: '#60a5fa',
  proposta_enviada: '#fbbf24',
  negociacao: '#f97316',
  ganho: '#22c55e',
  perdido: '#ef4444',
};

export const TIPO_CADASTRO_LABELS: Record<TipoCadastro, string> = {
  cliente: 'Cliente',
  prospecto: 'Prospecto',
  parte_contraria: 'Parte Contrária',
  correspondente: 'Correspondente',
  testemunha: 'Testemunha',
  perito: 'Perito',
  juiz: 'Juiz',
  promotor: 'Promotor',
  outros: 'Outros',
};

export const ORIGEM_LABELS: Record<OrigemCRM, string> = {
  indicacao: 'Indicação',
  site: 'Site',
  google: 'Google',
  redes_sociais: 'Redes Sociais',
  evento: 'Evento',
  parceria: 'Parceria',
  outros: 'Outros',
};

export const AREA_JURIDICA_LABELS: Record<AreaJuridica, string> = {
  civel: 'Cível',
  trabalhista: 'Trabalhista',
  criminal: 'Criminal',
  tributario: 'Tributário',
  empresarial: 'Empresarial',
  familia: 'Família',
  consumidor: 'Consumidor',
  previdenciario: 'Previdenciário',
  administrativo: 'Administrativo',
  outros: 'Outros',
};
