-- Migration: Reorganização de nomenclatura das tabelas
-- Padrão: modulo_nome_tabela (sempre em português)
-- Data: 2025-01-05
-- Apenas tabelas existentes

-- ==============================================================================
-- RENOMEAR TABELAS EXISTENTES
-- ==============================================================================

-- Módulo: CRM
ALTER TABLE IF EXISTS clientes RENAME TO crm_clientes;
ALTER TABLE IF EXISTS clientes_contatos RENAME TO crm_clientes_contatos;

-- Módulo: Agenda
ALTER TABLE IF EXISTS eventos RENAME TO agenda_eventos;

-- Módulo: Financeiro
ALTER TABLE IF EXISTS timesheet RENAME TO financeiro_timesheet;
ALTER TABLE IF EXISTS honorarios RENAME TO financeiro_honorarios;

-- Módulo: Dashboard
ALTER TABLE IF EXISTS dashboard_metrics RENAME TO dashboard_metricas;
ALTER TABLE IF EXISTS notifications RENAME TO dashboard_notificacoes;

-- Módulo: Escritórios (reordenar)
ALTER TABLE IF EXISTS usuarios_escritorios RENAME TO escritorios_usuarios;
ALTER TABLE IF EXISTS usuarios_escritorio_ativo RENAME TO escritorios_usuarios_ativo;

-- ==============================================================================
-- RENOMEAR ÍNDICES
-- ==============================================================================

-- CRM - Clientes
DROP INDEX IF EXISTS idx_clientes_escritorio;
DROP INDEX IF EXISTS idx_clientes_cpf_cnpj;
DROP INDEX IF EXISTS idx_clientes_responsavel;
CREATE INDEX idx_crm_clientes_escritorio ON crm_clientes(escritorio_id);
CREATE INDEX idx_crm_clientes_cpf_cnpj ON crm_clientes(cpf_cnpj);
CREATE INDEX idx_crm_clientes_responsavel ON crm_clientes(responsavel_id);

-- CRM - Contatos
DROP INDEX IF EXISTS idx_contatos_cliente;
CREATE INDEX idx_crm_clientes_contatos_cliente ON crm_clientes_contatos(cliente_id);

-- Dashboard - Métricas
CREATE INDEX idx_dashboard_metricas_escritorio ON dashboard_metricas(escritorio_id);
CREATE INDEX idx_dashboard_metricas_user ON dashboard_metricas(user_id);

-- Dashboard - Notificações
CREATE INDEX idx_dashboard_notificacoes_user_unread ON dashboard_notificacoes(user_id) WHERE NOT lida;

-- Financeiro - Timesheet
CREATE INDEX idx_financeiro_timesheet_escritorio ON financeiro_timesheet(escritorio_id);
CREATE INDEX idx_financeiro_timesheet_user ON financeiro_timesheet(user_id);
CREATE INDEX idx_financeiro_timesheet_processo ON financeiro_timesheet(processo_id);
CREATE INDEX idx_financeiro_timesheet_cliente ON financeiro_timesheet(cliente_id);
CREATE INDEX idx_financeiro_timesheet_faturavel ON financeiro_timesheet(escritorio_id) WHERE faturavel = true AND faturado = false;

-- Financeiro - Honorários
CREATE INDEX idx_financeiro_honorarios_escritorio ON financeiro_honorarios(escritorio_id);
CREATE INDEX idx_financeiro_honorarios_cliente ON financeiro_honorarios(cliente_id);
CREATE INDEX idx_financeiro_honorarios_processo ON financeiro_honorarios(processo_id);
CREATE INDEX idx_financeiro_honorarios_status ON financeiro_honorarios(status);

-- ==============================================================================
-- ATUALIZAR COMENTÁRIOS
-- ==============================================================================

COMMENT ON TABLE crm_clientes IS 'Módulo CRM: Cadastro de clientes (Pessoa Física e Jurídica)';
COMMENT ON TABLE crm_clientes_contatos IS 'Módulo CRM: Contatos dos clientes (telefone, email, endereço, redes sociais)';
COMMENT ON TABLE agenda_eventos IS 'Módulo Agenda: Eventos (compromissos, audiências, prazos, tarefas)';
COMMENT ON TABLE financeiro_timesheet IS 'Módulo Financeiro: Registro de horas trabalhadas';
COMMENT ON TABLE financeiro_honorarios IS 'Módulo Financeiro: Lançamentos de honorários';
COMMENT ON TABLE dashboard_metricas IS 'Módulo Dashboard: Métricas agregadas';
COMMENT ON TABLE dashboard_notificacoes IS 'Módulo Dashboard: Notificações do sistema';
COMMENT ON TABLE escritorios_usuarios IS 'Multi-tenant: Relacionamento usuários ↔ escritórios (N:N)';
COMMENT ON TABLE escritorios_usuarios_ativo IS 'Multi-tenant: Escritório ativo na sessão do usuário';
