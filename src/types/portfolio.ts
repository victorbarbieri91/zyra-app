// =====================================================
// TIPOS DO MÓDULO PORTFÓLIO
// Catálogo de Produtos Jurídicos
// =====================================================

// =====================================================
// ENUMS / TIPOS LITERAIS
// =====================================================

export type AreaJuridica = 'tributario' | 'societario' | 'trabalhista' | 'civel' | 'outro';

export type StatusProduto = 'rascunho' | 'ativo' | 'inativo' | 'arquivado';

export type Complexidade = 'baixa' | 'media' | 'alta' | 'simples' | 'complexa';

export type TipoPreco = 'fixo' | 'faixa' | 'por_fase' | 'hora' | 'exito';

export type TipoRecurso = 'template' | 'checklist' | 'modelo' | 'referencia' | 'material_apoio';

export type PrazoTipo = 'dias_corridos' | 'dias_uteis';

export type StatusProjeto = 'rascunho' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';

export type StatusFase = 'pendente' | 'em_andamento' | 'concluida' | 'pulada';

export type TipoAprendizado = 'nota_livre' | 'problema' | 'solucao' | 'melhoria' | 'licao_aprendida';

export type Impacto = 'baixo' | 'medio' | 'alto';

export type ResultadoProjeto = 'sucesso' | 'parcial' | 'insucesso';

// =====================================================
// LABELS PARA EXIBIÇÃO
// =====================================================

export const AREA_JURIDICA_LABELS: Record<AreaJuridica, string> = {
  tributario: 'Tributário',
  societario: 'Societário/Empresarial',
  trabalhista: 'Trabalhista',
  civel: 'Cível',
  outro: 'Outro',
};

export const AREA_JURIDICA_CORES: Record<AreaJuridica, string> = {
  tributario: 'amber',
  societario: 'blue',
  trabalhista: 'emerald',
  civel: 'purple',
  outro: 'slate',
};

export const AREA_JURIDICA_ICONES: Record<AreaJuridica, string> = {
  tributario: 'Calculator',
  societario: 'Building2',
  trabalhista: 'Users',
  civel: 'Scale',
  outro: 'Briefcase',
};

export const STATUS_PRODUTO_LABELS: Record<StatusProduto, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  inativo: 'Inativo',
  arquivado: 'Arquivado',
};

export const COMPLEXIDADE_LABELS: Record<Complexidade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  simples: 'Simples',
  complexa: 'Complexa',
};

export const TIPO_PRECO_LABELS: Record<TipoPreco, string> = {
  fixo: 'Valor Fixo',
  faixa: 'Faixa de Valores',
  por_fase: 'Por Fase',
  hora: 'Por Hora',
  exito: 'Êxito',
};

export const STATUS_PROJETO_LABELS: Record<StatusProjeto, string> = {
  rascunho: 'Rascunho',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const STATUS_FASE_LABELS: Record<StatusFase, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  pulada: 'Pulada',
};

export const TIPO_APRENDIZADO_LABELS: Record<TipoAprendizado, string> = {
  nota_livre: 'Nota Livre',
  problema: 'Problema Encontrado',
  solucao: 'Solução Encontrada',
  melhoria: 'Sugestão de Melhoria',
  licao_aprendida: 'Lição Aprendida',
};

export const IMPACTO_LABELS: Record<Impacto, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
};

export const RESULTADO_PROJETO_LABELS: Record<ResultadoProjeto, string> = {
  sucesso: 'Sucesso',
  parcial: 'Parcial',
  insucesso: 'Insucesso',
};

// =====================================================
// INTERFACES - PRODUTOS
// =====================================================

export interface Produto {
  id: string;
  escritorio_id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  descricao_comercial?: string | null;
  area_juridica: AreaJuridica;
  categoria?: string | null;
  tags?: string[] | null;
  icone?: string | null;
  cor?: string | null;
  imagem_url?: string | null;
  status: StatusProduto;
  visivel_catalogo: boolean;
  duracao_estimada_dias?: number | null;
  complexidade?: Complexidade | null;
  versao_atual: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface ProdutoFase {
  id: string;
  produto_id: string;
  ordem: number;
  nome: string;
  descricao?: string | null;
  duracao_estimada_dias?: number | null;
  prazo_tipo?: PrazoTipo | null;
  fase_dependencia_id?: string | null;
  criar_evento_agenda: boolean;
  evento_titulo_template?: string | null;
  evento_descricao_template?: string | null;
  cor?: string | null;
  icone?: string | null;
  created_at: string;
  checklist?: ProdutoChecklist[];
}

export interface ProdutoChecklist {
  id: string;
  fase_id: string;
  ordem: number;
  item: string;
  obrigatorio: boolean;
  criar_tarefa: boolean;
  tarefa_prazo_dias?: number | null;
  created_at: string;
}

export interface ProdutoEquipePapel {
  id: string;
  produto_id: string;
  nome: string;
  descricao?: string | null;
  obrigatorio: boolean;
  quantidade_minima: number;
  habilidades_requeridas?: string[] | null;
  created_at: string;
}

export interface ProdutoPreco {
  id: string;
  produto_id: string;
  tipo: TipoPreco;
  valor_fixo?: number | null;
  valor_minimo?: number | null;
  valor_maximo?: number | null;
  valor_hora?: number | null;
  horas_estimadas?: number | null;
  percentual_exito?: number | null;
  valores_por_fase?: Record<string, number> | null;
  nome_opcao?: string | null;
  descricao?: string | null;
  ativo: boolean;
  padrao: boolean;
  created_at: string;
}

export interface ProdutoRecurso {
  id: string;
  produto_id: string;
  tipo: TipoRecurso;
  nome: string;
  descricao?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  arquivo_tipo?: string | null;
  fase_id?: string | null;
  created_at: string;
}

export interface ProdutoVersao {
  id: string;
  produto_id: string;
  versao: number;
  snapshot: ProdutoCompleto;
  alteracoes?: string | null;
  motivo?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface ProdutoCompleto extends Produto {
  fases: ProdutoFase[];
  precos: ProdutoPreco[];
  papeis_equipe: ProdutoEquipePapel[];
  recursos: ProdutoRecurso[];
  metricas?: ProdutoMetricas | null;
}

// View do catálogo
export interface ProdutoCatalogo extends Produto {
  total_fases: number;
  total_precos: number;
  total_papeis: number;
  preco_base?: number | null;
  total_execucoes: number;
  execucoes_concluidas: number;
  taxa_sucesso?: number | null;
  duracao_media_real?: number | null;
}

// =====================================================
// INTERFACES - PROJETOS
// =====================================================

export interface Projeto {
  id: string;
  escritorio_id: string;
  produto_id: string;
  produto_versao: number;
  cliente_id: string;
  codigo: string;
  nome: string;
  processo_id?: string | null;
  contrato_id?: string | null;
  preco_selecionado_id?: string | null;
  valor_negociado?: number | null;
  status: StatusProjeto;
  progresso_percentual: number;
  data_inicio?: string | null;
  data_prevista_conclusao?: string | null;
  data_conclusao?: string | null;
  resultado?: ResultadoProjeto | null;
  observacoes_resultado?: string | null;
  responsavel_id: string;
  observacoes?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface ProjetoFase {
  id: string;
  projeto_id: string;
  fase_produto_id?: string | null;
  ordem: number;
  nome: string;
  descricao?: string | null;
  status: StatusFase;
  progresso_percentual: number;
  data_inicio_prevista?: string | null;
  data_fim_prevista?: string | null;
  data_inicio_real?: string | null;
  data_fim_real?: string | null;
  evento_agenda_id?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  checklist?: ProjetoFaseChecklist[];
}

export interface ProjetoFaseChecklist {
  id: string;
  fase_projeto_id: string;
  checklist_produto_id?: string | null;
  ordem: number;
  item: string;
  obrigatorio: boolean;
  concluido: boolean;
  concluido_em?: string | null;
  concluido_por?: string | null;
  tarefa_id?: string | null;
  created_at: string;
}

export interface ProjetoEquipeMembro {
  id: string;
  projeto_id: string;
  user_id: string;
  papel_id?: string | null;
  papel_nome: string;
  pode_editar: boolean;
  recebe_notificacoes: boolean;
  created_at: string;
  user?: {
    id: string;
    nome: string;
    avatar_url?: string | null;
  };
}

export interface ProjetoAprendizado {
  id: string;
  projeto_id: string;
  tipo: TipoAprendizado;
  titulo: string;
  conteudo: string;
  categoria?: string | null;
  impacto?: Impacto | null;
  fase_projeto_id?: string | null;
  aplicar_ao_produto: boolean;
  aplicado_ao_produto: boolean;
  aplicado_em?: string | null;
  tags?: string[] | null;
  created_at: string;
  created_by?: string | null;
}

export interface ProjetoCompleto extends Projeto {
  produto: Produto;
  cliente: {
    id: string;
    nome_completo: string;
    tipo_pessoa: string;
  };
  responsavel: {
    id: string;
    nome: string;
  };
  fases: ProjetoFase[];
  equipe: ProjetoEquipeMembro[];
  aprendizados: ProjetoAprendizado[];
  processo?: {
    id: string;
    numero_cnj: string;
  } | null;
}

// View de projetos
export interface ProjetoListItem {
  id: string;
  escritorio_id: string;
  codigo: string;
  nome: string;
  status: StatusProjeto;
  progresso_percentual: number;
  data_inicio?: string | null;
  data_prevista_conclusao?: string | null;
  data_conclusao?: string | null;
  resultado?: ResultadoProjeto | null;
  valor_negociado?: number | null;
  created_at: string;
  updated_at: string;
  // Produto
  produto_id: string;
  produto_versao: number;
  produto_nome: string;
  produto_codigo: string;
  area_juridica: AreaJuridica;
  produto_icone?: string | null;
  produto_cor?: string | null;
  // Cliente
  cliente_id: string;
  cliente_nome: string;
  cliente_tipo: string;
  // Responsável
  responsavel_id: string;
  responsavel_nome: string;
  // Processo
  processo_id?: string | null;
  processo_numero?: string | null;
  // Contagens
  total_fases: number;
  fases_concluidas: number;
  total_equipe: number;
  total_aprendizados: number;
}

// =====================================================
// INTERFACES - MÉTRICAS
// =====================================================

export interface ProdutoMetricas {
  total_execucoes: number;
  execucoes_concluidas: number;
  execucoes_em_andamento: number;
  execucoes_canceladas: number;
  taxa_sucesso?: number | null;
  duracao_media_dias?: number | null;
  duracao_minima_dias?: number | null;
  duracao_maxima_dias?: number | null;
  receita_total: number;
  receita_media?: number | null;
  total_aprendizados: number;
}

export interface PortfolioDashboardMetricas {
  total_produtos_ativos: number;
  total_projetos_ativos: number;
  receita_mes_atual: number;
  receita_mes_anterior: number;
  taxa_sucesso_geral?: number | null;
  projetos_atrasados: number;
}

export interface MetricasPorArea {
  escritorio_id: string;
  area_juridica: AreaJuridica;
  total_produtos: number;
  produtos_ativos: number;
  total_projetos: number;
  projetos_em_andamento: number;
  projetos_concluidos: number;
  receita_total?: number | null;
  duracao_media_dias?: number | null;
}

// =====================================================
// INTERFACES - FORMULÁRIOS
// =====================================================

export interface ProdutoFormData {
  codigo?: string;
  nome: string;
  descricao?: string;
  descricao_comercial?: string;
  area_juridica: AreaJuridica;
  categoria?: string;
  tags?: string[];
  icone?: string;
  cor?: string;
  duracao_estimada_dias?: number;
  complexidade?: Complexidade;
  visivel_catalogo?: boolean;
}

export interface ProdutoFaseFormData {
  ordem?: number;
  nome: string;
  descricao?: string;
  duracao_estimada_dias?: number;
  prazo_tipo?: PrazoTipo;
  fase_dependencia_id?: string;
  criar_evento_agenda?: boolean;
  evento_titulo_template?: string;
  evento_descricao_template?: string;
  cor?: string;
  icone?: string;
}

export interface ProdutoPrecoFormData {
  tipo: TipoPreco;
  valor_fixo?: number;
  valor_minimo?: number;
  valor_maximo?: number;
  valor_hora?: number;
  horas_estimadas?: number;
  percentual_exito?: number;
  valores_por_fase?: Record<string, number>;
  nome_opcao?: string;
  descricao?: string;
  ativo?: boolean;
  padrao?: boolean;
}

export interface ProjetoFormData {
  produto_id: string;
  cliente_id: string;
  nome: string;
  processo_id?: string;
  preco_selecionado_id?: string;
  valor_negociado?: number;
  data_inicio?: string;
  data_prevista_conclusao?: string;
  responsavel_id: string;
  observacoes?: string;
  equipe?: Array<{
    user_id: string;
    papel_id?: string;
    papel_nome: string;
  }>;
}

export interface AprendizadoFormData {
  tipo: TipoAprendizado;
  titulo: string;
  conteudo: string;
  categoria?: string;
  impacto?: Impacto;
  fase_projeto_id?: string;
  aplicar_ao_produto?: boolean;
  tags?: string[];
}

// =====================================================
// INTERFACES - FILTROS
// =====================================================

export interface ProdutosFiltros {
  area_juridica?: AreaJuridica[];
  status?: StatusProduto[];
  categoria?: string[];
  tags?: string[];
  complexidade?: Complexidade[];
  visivel_catalogo?: boolean;
  busca?: string;
}

export interface ProjetosFiltros {
  status?: StatusProjeto[];
  produto_id?: string[];
  cliente_id?: string[];
  responsavel_id?: string[];
  area_juridica?: AreaJuridica[];
  resultado?: ResultadoProjeto[];
  data_inicio_de?: string;
  data_inicio_ate?: string;
  data_conclusao_de?: string;
  data_conclusao_ate?: string;
  busca?: string;
}

// =====================================================
// CATEGORIAS DE APRENDIZADO
// =====================================================

export const CATEGORIAS_APRENDIZADO = [
  { value: 'comunicacao', label: 'Comunicação' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'processo', label: 'Processo' },
  { value: 'equipe', label: 'Equipe' },
  { value: 'ferramenta', label: 'Ferramenta' },
  { value: 'outro', label: 'Outro' },
] as const;

export type CategoriaAprendizado = typeof CATEGORIAS_APRENDIZADO[number]['value'];
