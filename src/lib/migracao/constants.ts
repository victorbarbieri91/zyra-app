// ============================================
// CONSTANTES E SCHEMAS DO SISTEMA DE MIGRAÇÃO
// ============================================

import { CampoSchema, ModuloConfig, ModuloMigracao } from '@/types/migracao'

// Configuração dos módulos
export const MODULOS_CONFIG: ModuloConfig[] = [
  {
    id: 'crm',
    nome: 'CRM (Clientes)',
    descricao: 'Pessoas, clientes, prospects',
    icone: 'Users',
    cor: 'bg-blue-500',
    dependencias: []
  },
  {
    id: 'processos',
    nome: 'Processos',
    descricao: 'Processos judiciais e partes',
    icone: 'Scale',
    cor: 'bg-purple-500',
    dependencias: ['crm']
  },
  {
    id: 'consultivo',
    nome: 'Consultivo',
    descricao: 'Consultas e pareceres',
    icone: 'FileText',
    cor: 'bg-teal-500',
    dependencias: ['crm']
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    descricao: 'Tarefas, eventos, audiências',
    icone: 'Calendar',
    cor: 'bg-amber-500',
    dependencias: ['crm', 'processos']
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    descricao: 'Honorários e pagamentos',
    icone: 'DollarSign',
    cor: 'bg-green-500',
    dependencias: ['crm', 'processos']
  }
]

// Ordem de módulo para próximo
export const PROXIMO_MODULO: Record<ModuloMigracao, ModuloMigracao | null> = {
  crm: 'processos',
  processos: 'consultivo',
  consultivo: 'agenda',
  agenda: 'financeiro',
  financeiro: null
}

// Títulos dos steps
export const STEP_TITLES: Record<string, string> = {
  upload: 'Upload do Arquivo',
  mapeamento: 'Mapeamento de Campos',
  validacao: 'Validando Dados',
  revisao: 'Revisão de Erros',
  confirmacao: 'Confirmação',
  importando: 'Importando',
  conclusao: 'Concluído'
}

// Schemas de campos por módulo
export const SCHEMAS: Record<ModuloMigracao, CampoSchema[]> = {
  crm: [
    { campo: 'nome_completo', tipo: 'texto', obrigatorio: true, descricao: 'Nome completo ou razão social' },
    { campo: 'cpf_cnpj', tipo: 'documento', obrigatorio: false, descricao: 'CPF (11 dígitos) ou CNPJ (14 dígitos)' },
    { campo: 'tipo_contato', tipo: 'enum', obrigatorio: false, valores: ['cliente', 'prospecto', 'parte_contraria', 'correspondente', 'testemunha', 'perito', 'juiz', 'promotor', 'outros'], descricao: 'Tipo de contato' },
    { campo: 'email_principal', tipo: 'email', obrigatorio: false, descricao: 'E-mail principal' },
    { campo: 'telefone_principal', tipo: 'telefone', obrigatorio: false, descricao: 'Telefone fixo' },
    { campo: 'celular', tipo: 'telefone', obrigatorio: false, descricao: 'Celular/WhatsApp' },
    { campo: 'cep', tipo: 'texto', obrigatorio: false, descricao: 'CEP' },
    { campo: 'logradouro', tipo: 'texto', obrigatorio: false, descricao: 'Rua/Avenida' },
    { campo: 'numero', tipo: 'texto', obrigatorio: false, descricao: 'Número' },
    { campo: 'complemento', tipo: 'texto', obrigatorio: false, descricao: 'Complemento' },
    { campo: 'bairro', tipo: 'texto', obrigatorio: false, descricao: 'Bairro' },
    { campo: 'cidade', tipo: 'texto', obrigatorio: false, descricao: 'Cidade' },
    { campo: 'uf', tipo: 'texto', obrigatorio: false, descricao: 'Estado (2 letras)' },
    { campo: 'data_nascimento', tipo: 'data', obrigatorio: false, descricao: 'Data de nascimento' },
    { campo: 'profissao', tipo: 'texto', obrigatorio: false, descricao: 'Profissão' },
    { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false, descricao: 'Observações gerais' }
  ],
  processos: [
    // Campos obrigatórios
    { campo: 'numero_cnj', tipo: 'texto', obrigatorio: true, descricao: 'Número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)' },
    { campo: 'cliente_ref', tipo: 'texto', obrigatorio: true, descricao: 'Nome ou CPF/CNPJ do cliente' },
    { campo: 'tipo', tipo: 'enum', obrigatorio: true, valores: ['judicial', 'administrativo', 'arbitragem'], descricao: 'Tipo de processo' },
    { campo: 'area', tipo: 'enum', obrigatorio: true, valores: ['civel', 'trabalhista', 'tributaria', 'familia', 'criminal', 'previdenciaria', 'consumidor', 'empresarial', 'ambiental', 'outra'], descricao: 'Área do direito' },
    { campo: 'polo_cliente', tipo: 'enum', obrigatorio: true, valores: ['ativo', 'passivo', 'terceiro'], descricao: 'Polo do cliente' },
    { campo: 'data_distribuicao', tipo: 'data', obrigatorio: true, descricao: 'Data de distribuição' },
    { campo: 'responsavel_ref', tipo: 'texto', obrigatorio: true, descricao: 'E-mail do advogado responsável' },
    // Campos opcionais
    { campo: 'numero_pasta', tipo: 'texto', obrigatorio: false, descricao: 'Número interno da pasta' },
    { campo: 'fase', tipo: 'enum', obrigatorio: false, valores: ['conhecimento', 'recurso', 'execucao', 'cumprimento_sentenca'], descricao: 'Fase processual' },
    { campo: 'instancia', tipo: 'enum', obrigatorio: false, valores: ['1a', '2a', '3a', 'stj', 'stf', 'tst', 'administrativa'], descricao: 'Instância atual' },
    { campo: 'tribunal', tipo: 'texto', obrigatorio: false, descricao: 'Ex: TJSP, TRT-2, STJ' },
    { campo: 'uf', tipo: 'texto', obrigatorio: false, descricao: 'Estado (2 letras: SP, RJ, MG...)' },
    { campo: 'rito', tipo: 'enum', obrigatorio: false, valores: ['ordinario', 'sumario', 'especial', 'sumarissimo'], descricao: 'Rito processual' },
    { campo: 'comarca', tipo: 'texto', obrigatorio: false, descricao: 'Comarca' },
    { campo: 'vara', tipo: 'texto', obrigatorio: false, descricao: 'Vara' },
    { campo: 'autor', tipo: 'texto', obrigatorio: false, descricao: 'Nome do autor da ação' },
    { campo: 'reu', tipo: 'texto', obrigatorio: false, descricao: 'Nome do réu da ação' },
    { campo: 'parte_contraria', tipo: 'texto', obrigatorio: false, descricao: 'Nome da parte contrária' },
    { campo: 'valor_causa', tipo: 'numero', obrigatorio: false, descricao: 'Valor da causa' },
    { campo: 'valor_acordo', tipo: 'numero', obrigatorio: false, descricao: 'Valor do acordo (se houver)' },
    { campo: 'valor_condenacao', tipo: 'numero', obrigatorio: false, descricao: 'Valor da condenação (se houver)' },
    { campo: 'valor_atualizado', tipo: 'numero', obrigatorio: false, descricao: 'Valor atualizado do processo' },
    { campo: 'objeto_acao', tipo: 'texto_longo', obrigatorio: false, descricao: 'Objeto/pedido da ação' },
    { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['ativo', 'suspenso', 'arquivado', 'baixado', 'transito_julgado', 'acordo'], descricao: 'Status do processo' },
    { campo: 'link_tribunal', tipo: 'texto', obrigatorio: false, descricao: 'Link para consulta no tribunal' },
    { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false, descricao: 'Observações' }
  ],
  consultivo: [
    { campo: 'numero_interno', tipo: 'texto', obrigatorio: false, descricao: 'Código interno da consulta' },
    { campo: 'cliente_ref', tipo: 'texto', obrigatorio: true, descricao: 'Nome ou CPF/CNPJ do cliente' },
    { campo: 'tipo', tipo: 'enum', obrigatorio: false, valores: ['simples', 'parecer', 'contrato', 'due_diligence', 'opiniao'], descricao: 'Tipo de consulta' },
    { campo: 'area', tipo: 'enum', obrigatorio: false, valores: ['tributaria', 'societaria', 'trabalhista', 'civel', 'contratual', 'empresarial', 'outra'], descricao: 'Área jurídica' },
    { campo: 'assunto', tipo: 'texto', obrigatorio: true, descricao: 'Assunto da consulta' },
    { campo: 'descricao', tipo: 'texto_longo', obrigatorio: false, descricao: 'Descrição detalhada' },
    { campo: 'data_recebimento', tipo: 'data', obrigatorio: false, descricao: 'Data de recebimento' },
    { campo: 'prazo_cliente', tipo: 'data', obrigatorio: false, descricao: 'Prazo do cliente' },
    { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['nova', 'em_analise', 'em_revisao', 'concluida', 'enviada'], descricao: 'Status' },
    { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false, descricao: 'Observações' }
  ],
  agenda: [
    { campo: 'titulo', tipo: 'texto', obrigatorio: true, descricao: 'Título do compromisso/tarefa' },
    { campo: 'tipo_item', tipo: 'enum', obrigatorio: false, valores: ['tarefa', 'evento', 'audiencia'], descricao: 'Tipo de item' },
    { campo: 'data_inicio', tipo: 'data_hora', obrigatorio: true, descricao: 'Data/hora de início' },
    { campo: 'data_fim', tipo: 'data_hora', obrigatorio: false, descricao: 'Data/hora de fim' },
    { campo: 'descricao', tipo: 'texto_longo', obrigatorio: false, descricao: 'Descrição' },
    { campo: 'processo_ref', tipo: 'texto', obrigatorio: false, descricao: 'Número CNJ do processo' },
    { campo: 'cliente_ref', tipo: 'texto', obrigatorio: false, descricao: 'Nome ou CPF do cliente' },
    { campo: 'local', tipo: 'texto', obrigatorio: false, descricao: 'Local' },
    { campo: 'prioridade', tipo: 'enum', obrigatorio: false, valores: ['alta', 'media', 'baixa'], descricao: 'Prioridade' },
    { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['pendente', 'em_andamento', 'concluida', 'cancelada'], descricao: 'Status' },
    { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false, descricao: 'Observações' }
  ],
  financeiro: [
    { campo: 'cliente_ref', tipo: 'texto', obrigatorio: true, descricao: 'Nome ou CPF/CNPJ do cliente' },
    { campo: 'processo_ref', tipo: 'texto', obrigatorio: false, descricao: 'Número CNJ do processo' },
    { campo: 'descricao', tipo: 'texto', obrigatorio: true, descricao: 'Descrição do honorário' },
    { campo: 'valor_total', tipo: 'numero', obrigatorio: true, descricao: 'Valor total' },
    { campo: 'tipo_lancamento', tipo: 'enum', obrigatorio: false, valores: ['fixo', 'hora', 'etapa', 'exito', 'avulso'], descricao: 'Tipo de lançamento' },
    { campo: 'data_competencia', tipo: 'data', obrigatorio: false, descricao: 'Data de competência' },
    { campo: 'data_vencimento', tipo: 'data', obrigatorio: false, descricao: 'Data de vencimento' },
    { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['proposta', 'aprovado', 'em_aberto', 'pago', 'cancelado'], descricao: 'Status' },
    { campo: 'forma_pagamento', tipo: 'texto', obrigatorio: false, descricao: 'Forma de pagamento' },
    { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false, descricao: 'Observações' }
  ]
}

// Função helper para obter schema do módulo
export function getSchemaCampos(modulo: ModuloMigracao): CampoSchema[] {
  return SCHEMAS[modulo] || []
}

// Função helper para obter config do módulo
export function getModuloConfig(modulo: ModuloMigracao): ModuloConfig | undefined {
  return MODULOS_CONFIG.find(m => m.id === modulo)
}
