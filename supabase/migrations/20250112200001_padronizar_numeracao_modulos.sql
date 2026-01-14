-- Migration: Padronização de Numeração - Processos e Consultivo
-- Data: 2025-01-12
-- Descrição: Implementa formato PROC-0001 e CONS-0001 com sequências separadas por módulo
-- Status: JÁ APLICADA VIA MCP

-- =====================================================
-- 1. CRIAR TABELA DE SEQUÊNCIAS POR MÓDULO
-- =====================================================

CREATE TABLE IF NOT EXISTS numeracao_modulos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN ('processos', 'consultivo', 'honorarios', 'contratos', 'documentos')),
  prefixo text NOT NULL,
  ultimo_numero integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(escritorio_id, modulo)
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_numeracao_modulos_escritorio ON numeracao_modulos(escritorio_id);

-- RLS
ALTER TABLE numeracao_modulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver numeracao do seu escritorio" ON numeracao_modulos;
CREATE POLICY "Usuarios podem ver numeracao do seu escritorio" ON numeracao_modulos
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "Usuarios podem inserir numeracao do seu escritorio" ON numeracao_modulos;
CREATE POLICY "Usuarios podem inserir numeracao do seu escritorio" ON numeracao_modulos
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "Usuarios podem atualizar numeracao do seu escritorio" ON numeracao_modulos;
CREATE POLICY "Usuarios podem atualizar numeracao do seu escritorio" ON numeracao_modulos
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

COMMENT ON TABLE numeracao_modulos IS 'Controle de numeração sequencial por módulo e escritório';

-- =====================================================
-- 2. FUNÇÃO GENÉRICA DE GERAÇÃO DE NÚMERO
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_numero_modulo(
  p_escritorio_id uuid,
  p_modulo text,
  p_prefixo text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proximo integer;
BEGIN
  -- Garantir que existe registro para o escritório/módulo
  INSERT INTO numeracao_modulos (escritorio_id, modulo, prefixo, ultimo_numero)
  VALUES (p_escritorio_id, p_modulo, p_prefixo, 0)
  ON CONFLICT (escritorio_id, modulo) DO NOTHING;

  -- Incrementar atomicamente e retornar
  UPDATE numeracao_modulos
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = now()
  WHERE escritorio_id = p_escritorio_id
    AND modulo = p_modulo
  RETURNING ultimo_numero INTO v_proximo;

  -- Retornar formato PREFIXO-0001
  RETURN p_prefixo || '-' || LPAD(v_proximo::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION gerar_numero_modulo IS 'Gera número sequencial no formato PREFIXO-0001 por módulo/escritório';

-- =====================================================
-- 3. ATUALIZAR TRIGGER DE PROCESSOS
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_numero_pasta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se numero_pasta não foi fornecido, gerar automaticamente
  IF NEW.numero_pasta IS NULL OR NEW.numero_pasta = '' THEN
    NEW.numero_pasta := gerar_numero_modulo(NEW.escritorio_id, 'processos', 'PROC');
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. ATUALIZAR TRIGGER DE CONSULTIVO
-- =====================================================

CREATE OR REPLACE FUNCTION consultivo_gerar_numero_unificado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se numero_interno não foi fornecido, gerar automaticamente
  IF NEW.numero_interno IS NULL OR NEW.numero_interno = '' THEN
    NEW.numero_interno := gerar_numero_modulo(NEW.escritorio_id, 'consultivo', 'CONS');
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. MIGRAÇÃO DE DADOS (executada manualmente)
-- =====================================================
-- Os comandos abaixo foram executados manualmente via MCP:
--
-- -- Processos: 1000 → PROC-1000
-- ALTER TABLE processos_processos DISABLE TRIGGER processos_historico_auto;
-- UPDATE processos_processos
-- SET numero_pasta = 'PROC-' || LPAD(numero_pasta, 4, '0')
-- WHERE numero_pasta ~ '^\d+$';
-- ALTER TABLE processos_processos ENABLE TRIGGER processos_historico_auto;
--
-- -- Consultivo: CONS-2025-0001 → CONS-0001
-- UPDATE consultivo_consultas
-- SET numero_interno = 'CONS-' || LPAD(
--   SUBSTRING(numero_interno FROM '(\d+)$')::text, 4, '0'
-- )
-- WHERE numero_interno ~ '^CONS-\d{4}-\d+$';
--
-- -- Inicialização dos contadores foi feita automaticamente
