// =====================================================
// TIPOS DO MODULO DE RELATORIOS DE PROCESSOS
// =====================================================

// =====================================================
// COLUNAS DISPONIVEIS
// =====================================================

export interface ColunaRelatorio {
  field: string;
  label: string;
  width?: number;
  format?: 'text' | 'date' | 'currency' | 'number';
  special?: boolean; // Para colunas especiais como resumo_ia
}

export const COLUNAS_DISPONIVEIS: ColunaRelatorio[] = [
  { field: 'numero_pasta', label: 'Pasta', width: 10 },
  { field: 'numero_cnj', label: 'Processo (CNJ)', width: 25 },
  { field: 'area', label: 'Area', width: 12 },
  { field: 'fase', label: 'Fase', width: 15 },
  { field: 'instancia', label: 'Instancia', width: 10 },
  { field: 'tribunal', label: 'Tribunal', width: 15 },
  { field: 'vara', label: 'Vara', width: 20 },
  { field: 'comarca', label: 'Comarca', width: 15 },
  { field: 'status', label: 'Status', width: 12 },
  { field: 'autor', label: 'Autor', width: 30 },
  { field: 'reu', label: 'Reu', width: 30 },
  { field: 'parte_contraria', label: 'Parte Contraria', width: 30 },
  { field: 'polo_cliente', label: 'Polo do Cliente', width: 12 },
  { field: 'valor_causa', label: 'Valor da Causa', width: 15, format: 'currency' },
  { field: 'valor_atualizado', label: 'Valor Atualizado', width: 15, format: 'currency' },
  { field: 'data_distribuicao', label: 'Data Distribuicao', width: 12, format: 'date' },
  { field: 'objeto_acao', label: 'Objeto da Acao', width: 40 },
  { field: 'responsavel_nome', label: 'Advogado Responsavel', width: 20 },
  // Coluna especial - gerada pela IA
  { field: 'resumo_ia', label: 'Andamento/Atualizacao', width: 60, special: true },
];

// Colunas padrao para novos templates
export const COLUNAS_PADRAO = [
  'numero_pasta',
  'numero_cnj',
  'area',
  'status',
  'valor_causa',
  'objeto_acao',
  'resumo_ia',
];

// =====================================================
// INTERFACES DO BANCO
// =====================================================

export interface RelatorioTemplate {
  id: string;
  escritorio_id: string;
  nome: string;
  descricao?: string | null;
  colunas: string[];
  incluir_logo: boolean;
  criado_por?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelatorioGerado {
  id: string;
  escritorio_id: string;
  template_id?: string | null;
  titulo: string;
  clientes_ids: string[];
  processos_ids: string[];
  colunas_usadas: string[];
  resumos_ia: Record<string, string>; // { processo_id: "resumo texto" }
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  status: 'gerando' | 'concluido' | 'erro';
  erro_mensagem?: string | null;
  gerado_por?: string | null;
  andamentos_salvos: boolean;
  created_at: string;
}

// =====================================================
// INTERFACES PARA GERACAO
// =====================================================

export interface ProcessoParaRelatorio {
  id: string;
  numero_pasta: string;
  numero_cnj?: string | null;
  area: string;
  fase?: string | null;
  instancia?: string | null;
  tribunal?: string | null;
  vara?: string | null;
  comarca?: string | null;
  status: string;
  autor?: string | null;
  reu?: string | null;
  parte_contraria?: string | null;
  polo_cliente: string;
  valor_causa?: number | null;
  valor_atualizado?: number | null;
  data_distribuicao: string;
  objeto_acao?: string | null;
  responsavel_nome?: string | null;
  cliente_id: string;
  cliente_nome?: string | null;
  // Resumo gerado pela IA
  resumo_ia?: string | null;
  // Movimentacoes para geracao do resumo
  movimentacoes?: MovimentacaoParaResumo[];
}

export interface MovimentacaoParaResumo {
  id: string;
  data_movimento: string;
  tipo_descricao?: string | null;
  descricao: string;
}

export interface ClienteParaRelatorio {
  id: string;
  nome_completo: string;
  cpf_cnpj?: string | null;
  processos_count: number;
}

// =====================================================
// INTERFACES PARA API
// =====================================================

export interface GerarRelatorioRequest {
  template_id?: string;
  colunas: string[];
  clientes_ids: string[];
  incluir_logo: boolean;
  salvar_andamentos: boolean;
  resumos: Record<string, string>; // { processo_id: "resumo texto" }
}

export interface GerarRelatorioResponse {
  sucesso: boolean;
  relatorio_id?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  erro?: string;
}

export interface GerarResumoIARequest {
  processo_id: string;
  numero_cnj: string;
  area: string;
  cliente_nome: string;
  polo_cliente: string;
  objeto_acao?: string;
  movimentacoes: MovimentacaoParaResumo[];
}

export interface GerarResumoIAResponse {
  sucesso: boolean;
  resumo?: string;
  erro?: string;
}

// =====================================================
// ESTADOS DO WIZARD
// =====================================================

export type WizardStep = 'colunas' | 'clientes' | 'revisao' | 'download';

export interface WizardState {
  step: WizardStep;
  // Etapa 1: Colunas
  template_id?: string;
  colunas: string[];
  incluir_logo: boolean;
  // Etapa 2: Clientes
  clientes_selecionados: ClienteParaRelatorio[];
  // Etapa 3: Revisao
  processos: ProcessoParaRelatorio[];
  resumos: Record<string, string>;
  carregando_resumos: boolean;
  // Etapa 4: Download
  relatorio_gerado?: RelatorioGerado;
  salvar_andamentos: boolean;
}

// Estado inicial do wizard
export const WIZARD_STATE_INICIAL: WizardState = {
  step: 'colunas',
  colunas: COLUNAS_PADRAO,
  incluir_logo: true,
  clientes_selecionados: [],
  processos: [],
  resumos: {},
  carregando_resumos: false,
  salvar_andamentos: true,
};
