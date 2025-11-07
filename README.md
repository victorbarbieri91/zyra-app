# Sistema Jurídico com IA - Documentação

## Visão Geral

Sistema jurídico completo integrado com inteligência artificial, desenvolvido com stack moderna (Supabase, n8n, Claude AI) para automação e otimização de escritórios de advocacia.

## Tecnologias Base

- **Frontend**: Framework moderno (React/Next.js)
- **Backend**: Supabase (PostgreSQL + Functions + Triggers)
- **IA**: Claude AI via MCP servers (Supabase, Context7, Playwright, Magic)
- **Automação**: n8n para workflows e agentes
- **Desenvolvimento**: Claude Code (vibe coding)

## Conceito Principal

O sistema possui um **módulo Centro de Comando** dedicado que funciona como interface conversacional com IA, permitindo:
- Consultas naturais sobre processos, clientes, prazos
- Execução de tarefas via comandos de texto ou voz
- Agendamentos e automações
- Análises e insights
- Acesso via atalho global (Ctrl/Cmd + K)

Além disso, o **Dashboard** oferece visão executiva com:
- Resumo do dia gerado por IA
- Métricas pessoais e da equipe
- KPIs principais
- Insights de gestão
- Ações rápidas

Toda funcionalidade do sistema é acessível via comandos naturais no Centro de Comando, além das interfaces tradicionais de cada módulo.

## Arquitetura

```
┌─────────────────────────────────────────┐
│         Frontend (UI)                    │
│  • Dashboard com Chat IA                │
│  • Módulos integrados                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Supabase                         │
│  • PostgreSQL Database                  │
│  • Edge Functions                       │
│  • Triggers e Agendamentos              │
│  • Real-time subscriptions              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Camada de IA                    │
│  • MCP Servers                          │
│  • n8n Workflows                        │
│  • Claude AI Integration                │
└─────────────────────────────────────────┘
```

## Módulos do Sistema

1. **Login + Cadastro** - Autenticação unificada
2. **Dashboard** - Centro de métricas e visão geral
3. **CRM** - Gestão de clientes e relacionamento
4. **Agenda** - Calendário jurídico e prazos processuais
5. **Processos** - Gestão completa de processos judiciais
6. **Consultivo** - Gestão de consultas e pareceres
7. **Publicações** - Monitoramento de diários oficiais (via API AASP)
8. **Financeiro** - Controle financeiro e honorários
9. **Relatórios** - Business Intelligence e analytics
10. **Documentos** - Gestão documental e templates
11. **Centro de Comando** - Interface conversacional com IA

## Estrutura da Documentação

Cada módulo possui documentação detalhada em arquivo separado:

- `01-login-cadastro.md` - Autenticação
- `02-dashboard.md` - Dashboard e métricas
- `03-crm.md` - Gestão de clientes
- `04-agenda.md` - Calendário jurídico
- `05-processos.md` - Gestão processual
- `06-consultivo.md` - Consultas e pareceres
- `07-publicacoes.md` - Diários oficiais (AASP)
- `08-financeiro.md` - Gestão financeira
- `09-relatorios.md` - Analytics
- `10-documentos.md` - Gestão documental
- `11-centro-comando.md` - Interface conversacional IA
- `database-schema.md` - Estrutura completa do banco

## Princípios de Desenvolvimento

1. **IA First**: Toda funcionalidade acessível via Centro de Comando (módulo dedicado de IA conversacional)
2. **Automação**: Usar triggers e functions do Supabase sempre que possível
3. **Real-time**: Aproveitar subscriptions para atualizações instantâneas
4. **Modular**: Cada módulo independente mas integrado
5. **Vibe Coding**: Documentação focada em funcionalidades, não em código

## Paleta de Cores "Sapphire"

Design elegante e profissional com azul safira e toques de prata metálico.

### Azul Safira (Primário)
```
Escuro:    #0F2557  - Headers, textos importantes, elementos de destaque
Principal: #1E3A8A  - Botões primários, links, ações principais
Médio:     #3B5998  - Hover states, badges, ícones secundários
Claro:     #93B5E1  - Backgrounds de destaque suave, estados inativos
```

### Prata Metálico (Accent/Secundário)
```
Principal: #7C8DB0  - Ações secundárias, elementos de suporte
Claro:     #D4DCE8  - Backgrounds sutis, divisores elegantes
```

### Cores de Estado
```
Sucesso:   #10B981  - Confirmações, métricas positivas
Atenção:   #F59E0B  - Alertas médios, itens para acompanhar
Info:      #3B82F6  - Informações neutras, dicas
```

### Neutros
```
Texto Principal:    #0F2557  - Títulos, textos de corpo
Texto Secundário:   #3B5998  - Subtítulos, descrições
Texto Terciário:    #93B5E1  - Placeholders, textos auxiliares
Border:             #D4DCE8  - Bordas, divisores
Background:         #F4F6F9  - Fundo geral do sistema
Surface:            #FFFFFF  - Cards, modais, áreas de conteúdo
```

### Aplicação
- **Botões primários**: Azul Safira Principal com gradiente sutil
- **Botões secundários**: Prata Metálico com hover
- **Links**: Azul Safira Principal
- **Cards**: Branco sobre background cinza claro
- **Headers**: Azul Safira Escuro
- **Badges/Tags**: Variações de azul claro e prata
- **Sem vermelho agressivo**: Apenas verde (sucesso) e âmbar (atenção)

**Vibe:** Luxuoso, corporativo premium, elegante como uma joia.

## Próximos Passos

1. Revisar documentação de cada módulo
2. Validar estrutura do banco de dados
3. Iniciar desenvolvimento do esqueleto com Claude Code
4. Implementar módulo por módulo
5. Integrar agentes de IA via n8n

## Comandos de IA (Exemplos via Centro de Comando)

- "Mostre processos com prazo vencendo esta semana"
- "Agende reunião com cliente João para amanhã às 14h"
- "Gere relatório financeiro do mês passado"
- "Consulte publicações do cliente XYZ nos últimos 30 dias"
- "Crie novo processo para cliente ABC"
- "Registrar 2.5h no processo #1234 - análise de documentos"
- "Faturar horas do cliente João Silva"
- "Quanto recebi este mês?"

**Acesso:** Ctrl/Cmd + K de qualquer tela ou botão no Dashboard
