-- Migration: Popular tabela agenda_feriados com feriados nacionais brasileiros
-- Data: 2025-01-06
-- Descrição: Insere feriados nacionais de 2025 e 2026

-- Feriados Nacionais 2025
INSERT INTO agenda_feriados (escritorio_id, nome, data, tipo, recorrente, created_at, updated_at)
VALUES
  -- 2025
  (NULL, 'Confraternização Universal', '2025-01-01', 'nacional', true, now(), now()),
  (NULL, 'Carnaval', '2025-03-03', 'nacional', true, now(), now()),
  (NULL, 'Carnaval', '2025-03-04', 'nacional', true, now(), now()),
  (NULL, 'Sexta-feira Santa', '2025-04-18', 'nacional', true, now(), now()),
  (NULL, 'Tiradentes', '2025-04-21', 'nacional', true, now(), now()),
  (NULL, 'Dia do Trabalho', '2025-05-01', 'nacional', true, now(), now()),
  (NULL, 'Corpus Christi', '2025-06-19', 'nacional', true, now(), now()),
  (NULL, 'Independência do Brasil', '2025-09-07', 'nacional', true, now(), now()),
  (NULL, 'Nossa Senhora Aparecida', '2025-10-12', 'nacional', true, now(), now()),
  (NULL, 'Finados', '2025-11-02', 'nacional', true, now(), now()),
  (NULL, 'Proclamação da República', '2025-11-15', 'nacional', true, now(), now()),
  (NULL, 'Dia da Consciência Negra', '2025-11-20', 'nacional', true, now(), now()),
  (NULL, 'Natal', '2025-12-25', 'nacional', true, now(), now()),

  -- 2026
  (NULL, 'Confraternização Universal', '2026-01-01', 'nacional', true, now(), now()),
  (NULL, 'Carnaval', '2026-02-16', 'nacional', true, now(), now()),
  (NULL, 'Carnaval', '2026-02-17', 'nacional', true, now(), now()),
  (NULL, 'Sexta-feira Santa', '2026-04-03', 'nacional', true, now(), now()),
  (NULL, 'Tiradentes', '2026-04-21', 'nacional', true, now(), now()),
  (NULL, 'Dia do Trabalho', '2026-05-01', 'nacional', true, now(), now()),
  (NULL, 'Corpus Christi', '2026-06-04', 'nacional', true, now(), now()),
  (NULL, 'Independência do Brasil', '2026-09-07', 'nacional', true, now(), now()),
  (NULL, 'Nossa Senhora Aparecida', '2026-10-12', 'nacional', true, now(), now()),
  (NULL, 'Finados', '2026-11-02', 'nacional', true, now(), now()),
  (NULL, 'Proclamação da República', '2026-11-15', 'nacional', true, now(), now()),
  (NULL, 'Dia da Consciência Negra', '2026-11-20', 'nacional', true, now(), now()),
  (NULL, 'Natal', '2026-12-25', 'nacional', true, now(), now())
ON CONFLICT DO NOTHING;

-- Comentário sobre uso
COMMENT ON TABLE agenda_feriados IS 'Tabela de feriados nacionais, estaduais e municipais. Quando escritorio_id é NULL, o feriado é nacional e se aplica a todos os escritórios.';
