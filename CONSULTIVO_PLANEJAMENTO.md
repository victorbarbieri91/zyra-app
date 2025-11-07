# Planejamento Completo - Módulo Consultivo

## ✅ Status: Estrutura Base Implementada

### 📊 Resumo do que foi feito

1. **Banco de Dados - COMPLETO** ✅
   - 11 tabelas criadas com prefixo `consultivo_`
   - RLS policies implementadas
   - Views para consultas agregadas
   - Triggers automáticos para timeline
   - Funções auxiliares

2. **Interface - BASE CRIADA** ✅
   - Botão no Sidebar (ícone Scale)
   - Página principal com lista de consultas
   - KPIs: Pendentes, Atrasadas, Concluídas, Horas Não Faturadas
   - Filtros: Pendentes, Atrasadas, Minhas, Todas
   - Busca por assunto/número

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. `consultivo_consultas` - Tabela Principal
```sql
- id, escritorio_id, numero_interno
- tipo: simples, parecer, contrato, due_diligence, opiniao
- area: tributaria, societaria, trabalhista, etc
- cliente_id (FK crm_pessoas)
- assunto, descricao
- urgencia: alta, media, baixa
- prazo_cliente, sla_horas
- responsavel_id, revisor_id
- status: nova, em_analise, em_revisao, aguardando_cliente, concluida, enviada, cancelada
- forma_cobranca: fixo, hora, exito, pro_bono
- horas_estimadas, horas_reais
- valor_servico
```

#### 2. `consultivo_equipe`
- Membros da equipe trabalhando na consulta
- Papéis: responsavel, colaborador, revisor

#### 3. `consultivo_timeline`
- Histórico completo de ações
- Tipos: criacao, atribuicao, inicio_analise, conclusao, etc

#### 4. `consultivo_analise`
- Análises e pareceres com versionamento
- conteudo, versao, status
- notas_pesquisa, checklist, teses
- fundamentacao, conclusao, ressalvas
- Revisores e aprovadores

#### 5. `consultivo_documentos`
- Documentos anexados e gerados
- Tipos: recebido, gerado, minuta, final
- Versionamento de documentos

#### 6. `consultivo_referencias`
- Referências jurídicas (legislação, jurisprudência, doutrina)
- relevancia, citado_no_parecer

#### 7. `consultivo_timesheet`
- Registro de horas trabalhadas
- faturavel, faturado, honorario_id
- Atualiza automaticamente horas_reais da consulta

#### 8. `consultivo_templates_pareceres`
- Templates de pareceres por tipo e área
- estrutura (seções), variaveis, clausulas_padrao
- uso_count para tracking

#### 9. `consultivo_minutas_contratuais`
- Minutas de contratos reutilizáveis
- tipo_contrato, clausulas modulares
- variaveis_obrigatorias, variaveis_opcionais
- aprovado, uso_count

#### 10. `consultivo_clausulas_biblioteca`
- Biblioteca de cláusulas contratuais
- categoria, tipo_contrato[]
- texto_clausula com variáveis
- aprovada, uso_count

#### 11. `consultivo_precedentes_internos`
- Casos similares do escritório
- resumo, teses, palavras_chave
- Busca semântica por área e keywords

### Views Criadas

1. **v_consultivo_consultas_completas**
   - Dados agregados com joins
   - Cálculo de SLA e status
   - Contadores (docs, refs, timesheet)
   - Horas não faturadas

2. **v_consultivo_metricas_sla**
   - Métricas por área e responsável
   - Taxa de conclusão no prazo
   - Tempo médio de conclusão

3. **v_consultivo_pendentes**
   - Consultas em andamento priorizadas
   - Ordenação por SLA e urgência

### Funções

- `consultivo_gerar_numero_interno()` - Gera CONS-2025-0001
- `consultivo_buscar_precedentes_similares()` - Busca casos similares
- Triggers automáticos para timeline

---

## 🎨 Interface - Páginas a Implementar

### ✅ Página Principal (FEITA)
[/dashboard/consultivo/page.tsx](./src/app/dashboard/consultivo/page.tsx)

- Lista de consultas
- KPIs no topo
- Filtros e busca
- Views: Pendentes, Atrasadas, Minhas, Todas

### 📝 Próximas Páginas a Criar

#### 1. Wizard de Nova Consulta
**Rota:** `/dashboard/consultivo/nova`

**Passos:**
1. Dados Básicos
   - Cliente (busca)
   - Tipo de consulta
   - Área
   - Assunto e descrição

2. Classificação
   - Urgência
   - Prazo do cliente
   - SLA interno (calculado)

3. Atribuição
   - Responsável
   - Revisor (opcional)
   - Membros da equipe

4. Financeiro
   - Forma de cobrança
   - Valor fixo ou valor/hora
   - Horas estimadas

5. Documentos
   - Upload de documentos iniciais
   - Contratos para análise

**Componente:** `ConsultaWizard.tsx`

#### 2. Perfil da Consulta
**Rota:** `/dashboard/consultivo/[id]`

**Abas:**

**A. Resumo**
- Card com dados principais
- Status e SLA visual
- Timeline de atividades recentes
- Próximas ações
- Widget de registro rápido de horas (sticky)

**B. Análise/Parecer**
- Editor rico (TipTap ou similar)
- Versões anteriores
- Checklist de pontos
- Notas de pesquisa
- Teses e fundamentação
- Status: rascunho → revisão → aprovado
- Botões: Salvar rascunho, Enviar para revisão, Aprovar

**C. Pesquisa**
- Busca de referências
- Legislação aplicável
- Jurisprudências
- Precedentes do escritório
- Botão: Adicionar à consulta

**D. Documentos**
- Lista de documentos
- Upload
- Preview inline
- Versionamento

**E. Timesheet**
- Tabela de lançamentos
- Quick add no topo
- Total: trabalhado vs faturado
- Botão: Faturar horas pendentes (se cobrança por hora)

**F. Timeline**
- Histórico completo
- Filtros por tipo de ação

**Componentes:**
- `ConsultaPerfil.tsx`
- `ConsultaAnalise.tsx`
- `ConsultaPesquisa.tsx`
- `ConsultaDocumentos.tsx`
- `ConsultaTimesheet.tsx`

#### 3. Biblioteca de Templates
**Rota:** `/dashboard/consultivo/templates`

- Lista de templates de pareceres
- Filtros por tipo e área
- Criar/editar template
- Preview do template
- Uso count

**Componente:** `TemplatesLista.tsx`

#### 4. Biblioteca de Minutas
**Rota:** `/dashboard/consultivo/minutas`

- Lista de minutas contratuais
- Filtros por tipo de contrato
- Criar/editar minuta
- Cláusulas modulares
- Gerador de contrato

**Componentes:**
- `MinutasLista.tsx`
- `MinutaEditor.tsx`
- `GeradorContrato.tsx`

#### 5. Biblioteca de Cláusulas
**Rota:** `/dashboard/consultivo/clausulas`

- Grid de cláusulas
- Filtros por categoria
- Quick add de nova cláusula
- Aprovação de cláusulas
- Uso count

**Componente:** `ClausulasLista.tsx`

#### 6. Precedentes Internos
**Rota:** `/dashboard/consultivo/precedentes`

- Lista de precedentes
- Busca semântica
- Filtros por área e tags
- Visualizar precedente
- Aprovar para publicação

**Componente:** `PrecedentesLista.tsx`

---

## 🔄 Fluxo de Trabalho

### Criação de Consulta

1. Advogado cria consulta via wizard
2. Sistema gera número interno (CONS-2025-0001)
3. Calcula SLA automático
4. Notifica responsável
5. Registra na timeline

### Análise e Parecer

1. Responsável inicia análise (muda status)
2. Pode usar template ou começar do zero
3. Adiciona referências (legislação, jurisprudência)
4. Sistema sugere precedentes similares
5. Registra horas trabalhadas
6. Salva versões do parecer

### Revisão

1. Envia para revisor
2. Revisor adiciona comentários
3. Aprova ou solicita alterações
4. Nova versão é criada

### Conclusão

1. Marca como concluída
2. Envia ao cliente
3. Se cobrança por hora: fatura horas pendentes
4. Opcionalmente: transforma em precedente

---

## 🎯 Próximos Passos

### Prioridade 1 - Funcionalidades Essenciais

1. **Wizard de Nova Consulta**
   - Form multi-step
   - Validações
   - Upload de arquivos

2. **Perfil da Consulta - Aba Resumo**
   - Layout com cards
   - Timeline
   - Ações rápidas

3. **Perfil da Consulta - Aba Análise**
   - Editor rico (TipTap)
   - Versionamento
   - Salvar/Enviar para revisão

4. **Timesheet Widget**
   - Registro rápido inline
   - Sticky no perfil da consulta

### Prioridade 2 - Features Avançadas

5. **Biblioteca de Templates**
   - CRUD completo
   - Geração assistida por IA

6. **Pesquisa de Referências**
   - Busca em APIs externas
   - Integração com bases jurídicas

7. **Precedentes Internos**
   - Busca semântica
   - Recomendações automáticas

### Prioridade 3 - Integrações e IA

8. **Geração de Pareceres via IA**
   - Rascunho inicial
   - Sugestão de estrutura
   - Citação automática de jurisprudências

9. **Análise Contratual via IA**
   - Extração de cláusulas
   - Identificação de riscos
   - Comparação de versões

10. **Minutas Contratuais**
    - Editor de cláusulas modulares
    - Gerador com variáveis
    - Preview em tempo real

---

## 🔌 Integrações com IA

### Via Centro de Comando

```
"Quais consultas estão atrasadas?"
"Gere minuta de contrato de prestação de serviços"
"Analise o contrato anexado pela cliente Maria"
"Busque pareceres anteriores sobre LGPD"
"Qual o SLA médio da equipe tributária?"
"Responda consulta sobre prazo prescricional tributário"
```

### Automações com n8n

- Triagem inicial de consultas
- Atribuição inteligente por área
- Pesquisa automática de legislação
- Extração de dados de contratos
- Alertas de SLA
- Pesquisa em base de precedentes

---

## 📊 Métricas e Relatórios

### Dashboard do Consultivo

- Total de consultas por status
- SLA: cumprimento, atrasadas, média
- Horas trabalhadas vs faturadas
- Por advogado: volume, SLA, horas
- Por área: volume, tempo médio
- Por tipo: distribuição
- Top clientes consultivos

### Relatórios

- Relatório de SLA
- Relatório de faturamento (horas)
- Relatório de produtividade
- Análise de precedentes

---

## 🎨 Design System

Seguindo padrão do Dashboard:

### Cores
- Títulos: `#34495e`
- Gradientes KPI: `from-[#34495e] to-[#46627f]`
- Destaque: `#89bcbe`, `#aacfd0`
- Estados: emerald (ok), amber (atenção), red (urgente)

### Tipografia
- `text-2xl` - Headers, KPIs
- `text-sm` - Títulos de card
- `text-xs` - Labels, badges

### Ícones
- KPI: container `w-8 h-8`, ícone `w-4 h-4`
- Timeline: container `w-7 h-7`, ícone `w-3.5 h-3.5`

### Espaçamento
- `gap-6` - Seções principais
- `gap-4` - Cards em grid
- `py-2.5 px-3` - Botões

---

## ✅ Checklist de Implementação

### Backend (Supabase)
- [x] Tabelas principais criadas
- [x] Views criadas
- [x] RLS policies implementadas
- [x] Triggers automáticos
- [x] Funções auxiliares
- [ ] Edge Functions para IA
- [ ] Storage bucket para documentos

### Frontend
- [x] Botão no Sidebar
- [x] Página principal com lista
- [x] KPIs e filtros
- [ ] Wizard de nova consulta
- [ ] Perfil da consulta (abas)
- [ ] Editor de pareceres
- [ ] Timesheet widget
- [ ] Bibliotecas (templates, minutas, cláusulas)
- [ ] Precedentes

### Integrações
- [ ] Upload de documentos (Supabase Storage)
- [ ] Integração com módulo Financeiro (faturamento de horas)
- [ ] Centro de Comando (comandos consultivo)
- [ ] n8n workflows

---

## 📚 Referências

- Documentação: [06-consultivo.md](./06-consultivo.md)
- Design System: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- Módulo similar: [Processos](./src/app/dashboard/processos/)

---

**Data de criação:** 2025-01-11
**Status:** Estrutura base completa, pronto para desenvolvimento das páginas
