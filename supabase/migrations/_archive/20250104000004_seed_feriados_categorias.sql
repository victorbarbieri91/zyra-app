-- Módulo: Agenda - Seed Data
-- Dados iniciais: Feriados 2025-2026 e Categorias padrão

-- ============================================
-- FERIADOS NACIONAIS 2025
-- ============================================

INSERT INTO feriados (nome, data, tipo, fixo, recesso_forense) VALUES
-- 2025
('Confraternização Universal', '2025-01-01', 'nacional', true, true),
('Carnaval', '2025-03-03', 'nacional', false, true),
('Carnaval', '2025-03-04', 'nacional', false, true),
('Paixão de Cristo', '2025-04-18', 'nacional', false, true),
('Tiradentes', '2025-04-21', 'nacional', true, false),
('Dia do Trabalho', '2025-05-01', 'nacional', true, false),
('Corpus Christi', '2025-06-19', 'nacional', false, false),
('Independência do Brasil', '2025-09-07', 'nacional', true, false),
('Nossa Senhora Aparecida', '2025-10-12', 'nacional', true, false),
('Finados', '2025-11-02', 'nacional', true, false),
('Proclamação da República', '2025-11-15', 'nacional', true, false),
('Consciência Negra', '2025-11-20', 'nacional', true, false),
('Natal', '2025-12-25', 'nacional', true, true),
('Recesso Forense - Início', '2025-12-20', 'nacional', false, true),
('Recesso Forense', '2025-12-21', 'nacional', false, true),
('Recesso Forense', '2025-12-22', 'nacional', false, true),
('Recesso Forense', '2025-12-23', 'nacional', false, true),
('Recesso Forense', '2025-12-24', 'nacional', false, true),
('Recesso Forense', '2025-12-26', 'nacional', false, true),
('Recesso Forense', '2025-12-27', 'nacional', false, true),
('Recesso Forense', '2025-12-28', 'nacional', false, true),
('Recesso Forense', '2025-12-29', 'nacional', false, true),
('Recesso Forense', '2025-12-30', 'nacional', false, true),
('Recesso Forense', '2025-12-31', 'nacional', false, true),

-- 2026
('Confraternização Universal', '2026-01-01', 'nacional', true, true),
('Recesso Forense', '2026-01-02', 'nacional', false, true),
('Recesso Forense', '2026-01-03', 'nacional', false, true),
('Recesso Forense', '2026-01-04', 'nacional', false, true),
('Recesso Forense', '2026-01-05', 'nacional', false, true),
('Recesso Forense - Fim', '2026-01-06', 'nacional', false, true),
('Carnaval', '2026-02-16', 'nacional', false, true),
('Carnaval', '2026-02-17', 'nacional', false, true),
('Paixão de Cristo', '2026-04-03', 'nacional', false, true),
('Tiradentes', '2026-04-21', 'nacional', true, false),
('Dia do Trabalho', '2026-05-01', 'nacional', true, false),
('Corpus Christi', '2026-06-04', 'nacional', false, false),
('Independência do Brasil', '2026-09-07', 'nacional', true, false),
('Nossa Senhora Aparecida', '2026-10-12', 'nacional', true, false),
('Finados', '2026-11-02', 'nacional', true, false),
('Proclamação da República', '2026-11-15', 'nacional', true, false),
('Consciência Negra', '2026-11-20', 'nacional', true, false),
('Natal', '2026-12-25', 'nacional', true, true),
('Recesso Forense - Início', '2026-12-20', 'nacional', false, true);

-- ============================================
-- FERIADOS ESTADUAIS EXEMPLO (São Paulo)
-- ============================================

INSERT INTO feriados (nome, data, tipo, uf, fixo) VALUES
('Revolução Constitucionalista', '2025-07-09', 'estadual', 'SP', true),
('Revolução Constitucionalista', '2026-07-09', 'estadual', 'SP', true);

-- ============================================
-- FERIADOS MUNICIPAIS EXEMPLO (São Paulo Capital)
-- ============================================

INSERT INTO feriados (nome, data, tipo, uf, cidade, fixo) VALUES
('Aniversário de São Paulo', '2025-01-25', 'municipal', 'SP', 'São Paulo', true),
('Aniversário de São Paulo', '2026-01-25', 'municipal', 'SP', 'São Paulo', true);

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE feriados IS 'Tabela de feriados preenchida com datas nacionais 2025-2026. Adicionar feriados estaduais e municipais conforme necessário.';

-- ============================================
-- NOTA SOBRE CATEGORIAS
-- ============================================

-- As categorias de eventos são criadas por escritório, então não inserimos seed data aqui.
-- Elas serão criadas automaticamente ao criar um escritório ou podem ser criadas manualmente.

-- Exemplo de como criar categorias padrão para um escritório específico:
--
-- INSERT INTO eventos_categorias (escritorio_id, nome, cor, icone) VALUES
-- ('<escritorio_id>', 'Audiências', '#1E3A8A', 'gavel'),
-- ('<escritorio_id>', 'Reuniões com Clientes', '#89bcbe', 'users'),
-- ('<escritorio_id>', 'Prazos Críticos', '#dc2626', 'alert-circle'),
-- ('<escritorio_id>', 'Tarefas Administrativas', '#64748b', 'clipboard'),
-- ('<escritorio_id>', 'Treinamentos', '#8b5cf6', 'book');
