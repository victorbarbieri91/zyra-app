-- ============================================
-- SISTEMA DE MIGRAÇÃO DE DADOS
-- ============================================

-- 1. Tabela principal de jobs de migração
CREATE TABLE IF NOT EXISTS migracao_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Configuração
  modulo TEXT NOT NULL CHECK (modulo IN ('crm', 'processos', 'consultivo', 'agenda', 'financeiro')),
  arquivo_nome TEXT NOT NULL,
  arquivo_storage_path TEXT NOT NULL,
  mapeamento JSONB NOT NULL DEFAULT '{}',
  config JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente',
    'processando',
    'validando',
    'aguardando_revisao',
    'importando',
    'concluido',
    'erro',
    'cancelado'
  )),
  etapa_atual TEXT,

  -- Contadores
  total_linhas INTEGER DEFAULT 0,
  linhas_processadas INTEGER DEFAULT 0,
  linhas_validas INTEGER DEFAULT 0,
  linhas_com_erro INTEGER DEFAULT 0,
  linhas_duplicadas INTEGER DEFAULT 0,
  linhas_importadas INTEGER DEFAULT 0,

  -- Resultados detalhados
  erros JSONB DEFAULT '[]',
  duplicatas JSONB DEFAULT '[]',
  campos_extras JSONB DEFAULT '[]',
  resultado_final JSONB,

  -- Correções do usuário
  correcoes_usuario JSONB DEFAULT '{}',

  -- Timestamps
  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  criado_por UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para migracao_jobs
CREATE INDEX idx_migracao_jobs_escritorio ON migracao_jobs(escritorio_id);
CREATE INDEX idx_migracao_jobs_status ON migracao_jobs(status);
CREATE INDEX idx_migracao_jobs_modulo ON migracao_jobs(modulo);
CREATE INDEX idx_migracao_jobs_criado_por ON migracao_jobs(criado_por);
CREATE INDEX idx_migracao_jobs_pendentes ON migracao_jobs(escritorio_id, status)
  WHERE status NOT IN ('concluido', 'cancelado', 'erro');

-- Trigger para updated_at
CREATE TRIGGER set_migracao_jobs_updated_at
  BEFORE UPDATE ON migracao_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para migracao_jobs
ALTER TABLE migracao_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migracao_jobs_select" ON migracao_jobs
  FOR SELECT USING (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "migracao_jobs_insert" ON migracao_jobs
  FOR INSERT WITH CHECK (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "migracao_jobs_update" ON migracao_jobs
  FOR UPDATE USING (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "migracao_jobs_delete" ON migracao_jobs
  FOR DELETE USING (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

-- 2. Tabela de histórico de migrações
CREATE TABLE IF NOT EXISTS migracao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  job_id UUID REFERENCES migracao_jobs(id) ON DELETE SET NULL,

  modulo TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  total_importados INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  total_duplicatas INTEGER DEFAULT 0,

  detalhes JSONB,

  executado_por UUID REFERENCES profiles(id),
  executado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para migracao_historico
CREATE INDEX idx_migracao_historico_escritorio ON migracao_historico(escritorio_id);
CREATE INDEX idx_migracao_historico_modulo ON migracao_historico(modulo);
CREATE INDEX idx_migracao_historico_executado_em ON migracao_historico(executado_em DESC);

-- RLS para migracao_historico
ALTER TABLE migracao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migracao_historico_select" ON migracao_historico
  FOR SELECT USING (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "migracao_historico_insert" ON migracao_historico
  FOR INSERT WITH CHECK (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

-- 3. Storage bucket para arquivos temporários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'migracao-temp',
  'migracao-temp',
  false,
  10485760, -- 10MB
  ARRAY[
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Policies para o storage bucket
CREATE POLICY "migracao_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'migracao-temp' AND
    (storage.foldername(name))[1] IN (
      SELECT escritorio_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "migracao_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'migracao-temp' AND
    (storage.foldername(name))[1] IN (
      SELECT escritorio_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "migracao_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'migracao-temp' AND
    (storage.foldername(name))[1] IN (
      SELECT escritorio_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- 4. Função para limpar arquivos antigos (mais de 24h)
CREATE OR REPLACE FUNCTION limpar_migracao_temp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar jobs antigos não concluídos (mais de 7 dias)
  DELETE FROM migracao_jobs
  WHERE status IN ('pendente', 'erro', 'cancelado')
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Comentários
COMMENT ON TABLE migracao_jobs IS 'Jobs de migração de dados de planilhas';
COMMENT ON TABLE migracao_historico IS 'Histórico de migrações realizadas';
COMMENT ON COLUMN migracao_jobs.mapeamento IS 'Mapeamento de colunas: {"coluna_planilha": "campo_sistema"}';
COMMENT ON COLUMN migracao_jobs.erros IS 'Array de erros: [{linha, erros[], dados}]';
COMMENT ON COLUMN migracao_jobs.duplicatas IS 'Array de duplicatas: [{linha, campo, valor, existente}]';
