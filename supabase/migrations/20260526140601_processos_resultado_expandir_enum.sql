-- Expande a check constraint do campo `resultado` em processos_processos para aceitar
-- a terminologia jurídica nova (procedente/improcedente) e suas variações parciais,
-- mantendo os valores legados (favoravel/desfavoravel/parcial) para preservar o histórico
-- dos registros já existentes. Novos encerramentos passam a usar apenas os valores
-- canônicos novos; o frontend traduz os legados para os mesmos labels na exibição.

ALTER TABLE processos_processos
  DROP CONSTRAINT IF EXISTS processos_processos_resultado_check;

ALTER TABLE processos_processos
  ADD CONSTRAINT processos_processos_resultado_check CHECK (
    resultado IS NULL OR resultado = ANY (ARRAY[
      'favoravel'::text,
      'desfavoravel'::text,
      'parcial'::text,
      'sem_merito'::text,
      'procedente'::text,
      'improcedente'::text,
      'parcialmente_procedente'::text,
      'parcialmente_improcedente'::text
    ])
  );

COMMENT ON CONSTRAINT processos_processos_resultado_check ON processos_processos IS
  'Aceita valores legados (favoravel/desfavoravel/parcial) e novos canônicos (procedente/improcedente/parcialmente_procedente/parcialmente_improcedente). Novos registros usam apenas os canônicos; legados permanecem válidos para preservar histórico.';
