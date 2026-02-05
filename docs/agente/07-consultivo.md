# Módulo: Consultivo

> Gerado automaticamente em: 2026-02-05
> Tabelas: 2

## Descrição
Consultas e pareceres jurídicos

---

## Tabelas

### consultivo_consultas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| area | text | Sim | - |
| cliente_id | uuid | Sim | - |
| titulo | text | Sim | - |
| descricao | text | Não | - |
| prioridade | text | Sim | media::text |
| prazo | date | Não | - |
| responsavel_id | uuid | Sim | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |
| numero | text | Não | - |
| contrato_id | uuid | Não | - |
| anexos | jsonb | Não | []::jsonb |
| andamentos | jsonb | Não | []::jsonb |
| status | status_consultivo | Sim | ativo::status_consultivo |

**Notas**:
- `titulo`: Título/identificação da consulta
- `contrato_id`: Contrato de honorários vinculado para cobrança
- `anexos`: Referências a arquivos no Storage: [{nome, path, tipo, tamanho, created_at, created_by}]
- `andamentos`: Histórico de condução do caso: [{data, tipo, descricao, user_id}]

**Constraints**:
- `area`: area = ANY (ARRAY['tributaria'::text, 'societaria'::text, 'trabalhista'::text, 'civel'::text, 'criminal'::text, 'previdenciaria'::text, 'consumidor'::text, 'empresarial'::text, 'ambiental'::text, 'compliance'::text, 'contratual'::text, 'familia'::text, 'imobiliario'::text, 'propriedade_intelectual'::text, 'outra'::text, 'tributario'::text, 'societario'::text, 'outros'::text])
- `prioridade`: prioridade = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text, 'urgente'::text])

---

### consultivo_timeline

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| consulta_id | uuid | Sim | - |
| escritorio_id | uuid | Não | - |
| tipo_acao | text | Sim | - |
| descricao | text | Não | - |
| user_id | uuid | Não | - |
| metadata | jsonb | Não | {}::jsonb |
| created_at | timestamp with time zone | Não | now() |

---

