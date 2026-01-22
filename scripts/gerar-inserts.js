const fs = require('fs');
const consultas = require('./consultas-para-migracao.json');

// Gerar VALUES para SQL
const values = consultas.map(c => {
  const clienteNome = c.cliente_nome ? c.cliente_nome.replace(/'/g, "''") : '';
  const assunto = c.assunto ? c.assunto.replace(/'/g, "''") : 'Consulta migrada';
  const observacoes = c.observacoes ? c.observacoes.replace(/'/g, "''") : '';
  const tags = c.tags && c.tags.length > 0 ? c.tags.join(',') : '';
  const contratoId = c.contrato_id || '';
  const responsavelId = c.responsavel_id;

  return `  ('${clienteNome}', '${assunto}', '2024-01-01', '${responsavelId}', '${observacoes}', '${tags}', '${contratoId}')`;
}).join(',\n');

const sql = `-- Migração de ${consultas.length} consultas do xlsx
INSERT INTO consultivo_consultas (
  escritorio_id, tipo, area, cliente_id, assunto, descricao,
  prioridade, prazo, data_recebimento, responsavel_id, status,
  observacoes, tags, contrato_id
)
SELECT
  'f2568999-0ae6-47db-9293-a6f1672ed421',
  'simples',
  'outra',
  COALESCE(
    find_cliente_id(t.cliente_nome, 'f2568999-0ae6-47db-9293-a6f1672ed421'),
    CASE WHEN t.cliente_nome = 'Optical Sunglassses Ltda' THEN 'dccc86e2-6a60-49f1-ace4-5a748db42ded'::uuid END
  ),
  t.assunto,
  NULL,
  'media',
  NULL,
  t.data_recebimento::date,
  t.responsavel_id::uuid,
  'em_analise',
  NULLIF(t.observacoes, ''),
  CASE WHEN t.tags != '' THEN string_to_array(t.tags, ',') ELSE NULL END,
  CASE WHEN t.contrato_id != '' THEN t.contrato_id::uuid ELSE NULL END
FROM (VALUES
${values}
) AS t(cliente_nome, assunto, data_recebimento, responsavel_id, observacoes, tags, contrato_id)
WHERE COALESCE(
    find_cliente_id(t.cliente_nome, 'f2568999-0ae6-47db-9293-a6f1672ed421'),
    CASE WHEN t.cliente_nome = 'Optical Sunglassses Ltda' THEN 'dccc86e2-6a60-49f1-ace4-5a748db42ded'::uuid END
  ) IS NOT NULL;`;

fs.writeFileSync('./scripts/migracao-consultas.sql', sql);
console.log('SQL gerado:', consultas.length, 'registros');
console.log('Arquivo: scripts/migracao-consultas.sql');
