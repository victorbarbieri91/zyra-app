// Tipos do módulo Escritório

export type CargoNome = 'dono' | 'socio' | 'gerente' | 'senior' | 'pleno' | 'junior' | 'estagiario';
export type ModuloPermissao = 'financeiro' | 'relatorios' | 'configuracoes';

export interface Cargo {
  id: string;
  escritorio_id: string;
  nome: CargoNome;
  nome_display: string;
  nivel: number;
  cor: string | null;
  descricao: string | null;
  valor_hora_padrao: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CargoPermissao {
  id: string;
  cargo_id: string;
  modulo: ModuloPermissao;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_exportar: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CargoComPermissoes extends Cargo {
  permissoes: CargoPermissao[];
}

export interface MembroRemuneracao {
  salario_base: number;
  percentual_comissao: number;
  meta_horas_mensal: number;
  valor_hora: number;
}

export interface MembroCompleto {
  id: string;
  user_id: string;
  escritorio_id: string;
  cargo_id: string | null;
  cargo: Cargo | null;
  nome: string;
  email: string;
  avatar_url: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  is_owner: boolean;
  remuneracao: MembroRemuneracao;
  created_at?: string;
}

export interface ConviteEscritorio {
  id: string;
  escritorio_id: string;
  email: string;
  cargo_id: string | null;
  cargo?: Cargo | null;
  token: string;
  convidado_por: string;
  aceito: boolean;
  aceito_por: string | null;
  aceito_em: string | null;
  expira_em: string;
  created_at: string;
}

// Helpers para nomes de cargo
export const CARGO_LABELS: Record<CargoNome, string> = {
  dono: 'Dono',
  socio: 'Sócio',
  gerente: 'Gerente',
  senior: 'Sênior',
  pleno: 'Pleno',
  junior: 'Júnior',
  estagiario: 'Estagiário',
};

export const CARGO_CORES: Record<CargoNome, string> = {
  dono: '#34495e',
  socio: '#46627f',
  gerente: '#89bcbe',
  senior: '#6ba9ab',
  pleno: '#1E3A8A',
  junior: '#64748b',
  estagiario: '#94a3b8',
};

export const MODULO_LABELS: Record<ModuloPermissao, string> = {
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
};

export const PERMISSAO_LABELS = {
  pode_visualizar: 'Visualizar',
  pode_criar: 'Criar',
  pode_editar: 'Editar',
  pode_excluir: 'Excluir',
  pode_exportar: 'Exportar',
} as const;
