# Regras de Negócio — Zyra Legal

> Como o sistema funciona do ponto de vista de negócio.
> Estas regras NÃO são deriváveis apenas da estrutura do banco.

## Contratos e Cobrança

- Cada cliente pode ter um **contrato de honorários** (financeiro_contratos_honorarios)
- O contrato define a **forma de cobrança**: fixo, por_hora, por_etapa, misto, por_pasta, por_ato, por_cargo
- Campo `config` (jsonb) armazena detalhes da cobrança (valor fixo, percentuais, etc.)
- Campo `valores_cargo` (jsonb) define valor/hora por cargo do advogado (Sênior, Júnior, etc.)
- Contratos podem ser vinculados a processos via `contrato_id` em processos_processos

## Fluxo de Faturamento

1. **Timesheet**: advogados registram horas trabalhadas em `financeiro_timesheet`
2. **Cálculo**: horas × valor_hora (definido no timesheet ou no contrato por cargo)
3. **Fatura**: função `gerar_fatura_v3` agrupa timesheet + honorários pendentes em uma fatura
4. **Itens da fatura**: armazenados como JSONB em `financeiro_faturamento_faturas.itens`
5. Status da fatura: rascunho → enviada → paga / vencida / cancelada

## Processos como Hub Central

- **processos_processos** é o hub que conecta todos os módulos
- Um processo pode ter: tarefas, eventos, audiências, timesheet, honorários, documentos, movimentações
- "Título" do processo = CONCAT(autor, ' x ', reu) — NÃO existe coluna titulo
- numero_cnj é o identificador oficial (pode ser nulo para processos administrativos)
- Status do processo: ativo, suspenso, arquivado, baixado, transito_julgado, acordo
- Processos podem ser encerrados com resultado (favoravel, desfavoravel, parcial, sem_merito)

## CRM vs Profiles

- **profiles** = usuários/advogados DO ESCRITÓRIO (quem usa o sistema)
- **crm_pessoas** = clientes e contatos EXTERNOS (quem contrata o escritório)
- NUNCA confundir! O advogado responsável é `profiles.id`, o cliente é `crm_pessoas.id`
- crm_pessoas tem tipo_contato: 'cliente', 'contato', 'adverso'

## Agenda e Prazos

- **agenda_tarefas**: prazos processuais, follow-ups, administrativo. Usa DATE.
- **agenda_eventos**: compromissos, reuniões. Usa TIMESTAMPTZ.
- **agenda_audiencias**: audiências judiciais. Usa TIMESTAMPTZ, tem vara e tipo específico.
- **v_agenda_consolidada**: view que unifica as 3 tabelas acima (somente SELECT)
- Tarefas do tipo 'prazo_processual' são críticas — prazos judiciais perdidos têm consequências graves
- Responsáveis: campo `responsavel_id` (único) e `responsaveis_ids` (array uuid[] para múltiplos)

## Multitenancy (Escritório)

- TODAS as tabelas filtram por `escritorio_id`
- RLS (Row Level Security) aplicado automaticamente
- Mesmo assim, SEMPRE incluir WHERE escritorio_id = '{escritorio_id}' nas queries
- Dados de um escritório NUNCA devem vazar para outro

## Publicações AASP

- Sistema sincroniza publicações do Diário Oficial via AASP
- Publicações são analisadas automaticamente e vinculadas a processos
- Podem conter intimações, citações, decisões

## Consultivo

- consultivo_consultas tem campo `titulo` (diferente de processos que usa autor/reu)
- Consultas podem gerar pareceres (consultivo_pareceres)
- Consultas podem ser convertidas em processos (consultivo_origem_id em processos_processos)
