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
  role: string;
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

// ============================
// Tipos para Configuração Fiscal
// ============================

export type RegimeTributario = 'lucro_presumido' | 'simples_nacional' | 'lucro_real' | 'mei';

// Faixas do Simples Nacional - Anexo IV (Advocacia)
export interface FaixaSimplesNacional {
  faixa: number;
  receita_bruta_ate: number; // em R$
  aliquota_nominal: number; // em %
  valor_deduzir: number; // em R$
  aliquota_efetiva_min?: number; // para referência
  aliquota_efetiva_max?: number;
}

// Impostos individuais para Lucro Presumido
export interface ImpostoConfig {
  ativo: boolean;
  aliquota: number; // em %
  retido_na_fonte: boolean;
}

export interface ImpostosLucroPresumido {
  irrf: ImpostoConfig;     // Imposto de Renda Retido na Fonte
  pis: ImpostoConfig;      // PIS
  cofins: ImpostoConfig;   // COFINS
  csll: ImpostoConfig;     // Contribuição Social sobre Lucro Líquido
  iss: ImpostoConfig;      // ISS Municipal
  inss: ImpostoConfig;     // INSS (quando aplicável)
}

export interface ConfiguracaoFiscal {
  regime_tributario: RegimeTributario;

  // Dados do Lucro Presumido
  lucro_presumido?: {
    impostos: ImpostosLucroPresumido;
    percentual_presuncao: number; // 32% para serviços
  };

  // Dados do Simples Nacional
  simples_nacional?: {
    anexo: 'III' | 'IV' | 'V'; // Anexo IV para advocacia
    faixa_atual: number; // 1 a 6
    aliquota_efetiva: number; // Alíquota calculada
    rbt12: number; // Receita Bruta dos últimos 12 meses
    fator_r?: number; // Para migração entre anexos III e V
    inss_patronal_separado: boolean; // Anexo IV = true
  };

  // Configurações de exibição na fatura
  exibir_impostos_fatura: boolean;
  observacao_fiscal?: string; // Ex: "Documento sem valor fiscal"

  // Dados adicionais
  inscricao_municipal?: string;
  codigo_servico_iss?: string; // Código do serviço para ISS
  municipio_iss?: string;
}

// Resumo de impostos calculados para uma fatura
export interface ImpostosCalculados {
  base_calculo: number;
  irrf: { aliquota: number; valor: number; retido: boolean };
  pis: { aliquota: number; valor: number; retido: boolean };
  cofins: { aliquota: number; valor: number; retido: boolean };
  csll: { aliquota: number; valor: number; retido: boolean };
  iss: { aliquota: number; valor: number; retido: boolean };
  inss: { aliquota: number; valor: number; retido: boolean };
  total_retencoes: number;
  valor_liquido: number;
}

// Constantes com alíquotas padrão
export const ALIQUOTAS_LUCRO_PRESUMIDO: ImpostosLucroPresumido = {
  irrf: { ativo: true, aliquota: 1.5, retido_na_fonte: true },
  pis: { ativo: true, aliquota: 0.65, retido_na_fonte: true },
  cofins: { ativo: true, aliquota: 3.0, retido_na_fonte: true },
  csll: { ativo: true, aliquota: 1.0, retido_na_fonte: true },
  iss: { ativo: true, aliquota: 5.0, retido_na_fonte: true }, // Varia por município
  inss: { ativo: false, aliquota: 11.0, retido_na_fonte: false },
};

// Faixas do Simples Nacional - Anexo IV (2024/2025)
export const FAIXAS_SIMPLES_ANEXO_IV: FaixaSimplesNacional[] = [
  { faixa: 1, receita_bruta_ate: 180000, aliquota_nominal: 4.5, valor_deduzir: 0 },
  { faixa: 2, receita_bruta_ate: 360000, aliquota_nominal: 9.0, valor_deduzir: 8100 },
  { faixa: 3, receita_bruta_ate: 720000, aliquota_nominal: 10.2, valor_deduzir: 12420 },
  { faixa: 4, receita_bruta_ate: 1800000, aliquota_nominal: 14.0, valor_deduzir: 39780 },
  { faixa: 5, receita_bruta_ate: 3600000, aliquota_nominal: 22.0, valor_deduzir: 183780 },
  { faixa: 6, receita_bruta_ate: 4800000, aliquota_nominal: 33.0, valor_deduzir: 828000 },
];

export const REGIME_TRIBUTARIO_LABELS: Record<RegimeTributario, string> = {
  lucro_presumido: 'Lucro Presumido',
  simples_nacional: 'Simples Nacional',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
};

// Helper para calcular alíquota efetiva do Simples Nacional
export function calcularAliquotaEfetivaSimplesNacional(rbt12: number): {
  faixa: number;
  aliquota_efetiva: number;
  aliquota_nominal: number;
  valor_deduzir: number;
} {
  const faixaEncontrada = FAIXAS_SIMPLES_ANEXO_IV.find(f => rbt12 <= f.receita_bruta_ate)
    || FAIXAS_SIMPLES_ANEXO_IV[FAIXAS_SIMPLES_ANEXO_IV.length - 1];

  const aliquota_efetiva = rbt12 > 0
    ? ((rbt12 * (faixaEncontrada.aliquota_nominal / 100)) - faixaEncontrada.valor_deduzir) / rbt12 * 100
    : faixaEncontrada.aliquota_nominal;

  return {
    faixa: faixaEncontrada.faixa,
    aliquota_efetiva: Math.max(0, aliquota_efetiva),
    aliquota_nominal: faixaEncontrada.aliquota_nominal,
    valor_deduzir: faixaEncontrada.valor_deduzir,
  };
}

// Helper para calcular impostos de uma fatura no Lucro Presumido
export function calcularImpostosLucroPresumido(
  valorBruto: number,
  config: ImpostosLucroPresumido
): ImpostosCalculados {
  const irrf = config.irrf.ativo ? valorBruto * (config.irrf.aliquota / 100) : 0;
  const pis = config.pis.ativo ? valorBruto * (config.pis.aliquota / 100) : 0;
  const cofins = config.cofins.ativo ? valorBruto * (config.cofins.aliquota / 100) : 0;
  const csll = config.csll.ativo ? valorBruto * (config.csll.aliquota / 100) : 0;
  const iss = config.iss.ativo ? valorBruto * (config.iss.aliquota / 100) : 0;
  const inss = config.inss.ativo ? valorBruto * (config.inss.aliquota / 100) : 0;

  const total_retencoes =
    (config.irrf.retido_na_fonte ? irrf : 0) +
    (config.pis.retido_na_fonte ? pis : 0) +
    (config.cofins.retido_na_fonte ? cofins : 0) +
    (config.csll.retido_na_fonte ? csll : 0) +
    (config.iss.retido_na_fonte ? iss : 0) +
    (config.inss.retido_na_fonte ? inss : 0);

  return {
    base_calculo: valorBruto,
    irrf: { aliquota: config.irrf.aliquota, valor: irrf, retido: config.irrf.retido_na_fonte },
    pis: { aliquota: config.pis.aliquota, valor: pis, retido: config.pis.retido_na_fonte },
    cofins: { aliquota: config.cofins.aliquota, valor: cofins, retido: config.cofins.retido_na_fonte },
    csll: { aliquota: config.csll.aliquota, valor: csll, retido: config.csll.retido_na_fonte },
    iss: { aliquota: config.iss.aliquota, valor: iss, retido: config.iss.retido_na_fonte },
    inss: { aliquota: config.inss.aliquota, valor: inss, retido: config.inss.retido_na_fonte },
    total_retencoes,
    valor_liquido: valorBruto - total_retencoes,
  };
}
