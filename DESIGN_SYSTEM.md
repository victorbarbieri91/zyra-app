# Sistema de Design - Zyra Legal

> Padrões de UI/UX estabelecidos no Dashboard. Seguir em todos os módulos.

## Paleta de Cores

### Cores Principais
```
#34495e - Títulos, textos importantes, gradientes escuros
#46627f - Subtítulos, textos secundários
#89bcbe - Ícones destaque, bordas especiais (Agenda)
#aacfd0 - Backgrounds suaves, gradientes claros
#1E3A8A - Accent (botões, links)
#f0f9f9, #e8f5f5 - Backgrounds cards financeiros
```

### Tailwind Neutros
```
slate-50, slate-100 - Backgrounds
slate-200 - Bordas padrão
slate-600, slate-700 - Textos
```

### Estados
```
emerald - Sucesso/positivo
amber - Alerta/atenção
red - Urgente/erro
blue, teal - Informativo
```

### Gradientes KPIs
```
KPI 1: from-[#34495e] to-[#46627f]
KPI 2: from-[#46627f] to-[#6c757d]
KPI 3: from-[#89bcbe] to-[#aacfd0]
KPI 4: from-[#aacfd0] to-[#cbe2e2]
```

---

## Tipografia

```
text-2xl - Header página, valores KPI
text-base - Títulos card principais
text-sm - Títulos card padrão, conteúdo normal, data
text-xs - Labels, subtítulos, trends
text-[11px] - Descrições insights
text-[10px] - Badges, detalhes mínimos

font-normal (400) - Textos
font-medium (500) - Labels
font-semibold (600) - Títulos, valores
font-bold (700) - Destaque números
```

---

## Ícones

```
KPI Cards: container w-8 h-8, ícone w-4 h-4 (32px/16px)
Timeline: container w-7 h-7, ícone w-3.5 h-3.5 (28px/14px)
Insights: container w-7 h-7, ícone w-3.5 h-3.5 (28px/14px)
Botão Highlight: w-4 h-4 (16px)
Botão Normal: w-3.5 h-3.5 (14px)
```

---

## Espaçamento

```
gap-6 - Entre seções principais (24px)
gap-4 - Entre cards em grid (16px)
gap-2.5 - Entre botões ações rápidas (10px)
gap-2 - Entre botões alternativos (8px)
gap-1.5 a gap-3 - Internos de componentes

Card Header: pb-2, pt-3 ou pt-4
Card Content: pt-2, pb-3 ou pb-4
Botões: py-2.5 px-3
```

---

## Bordas e Sombras

```
Bordas: border-slate-200 (padrão), border-[#89bcbe] (destaque)
Radius: rounded-lg (8px) para cards/botões/ícones
Sombras: shadow-sm (cards), shadow-lg (hover), shadow-xl (destaques)
```

---

## Componentes Reutilizáveis

### MetricCard (KPIs)
```tsx
<MetricCard
  title="Processos Ativos"  // text-xs
  value={47}                 // text-2xl
  icon={Briefcase}           // w-4 h-4 em container w-8 h-8
  trend={{ value: 8, label: 'esta semana' }}  // text-xs
  gradient="kpi1"            // from-[#34495e] to-[#46627f]
/>
```

### InsightCard
```tsx
<InsightCard
  type="oportunidade"        // emerald/amber/teal/blue
  title="..."                // text-xs font-semibold
  description="..."          // text-[11px]
  action={{ label: '...', onClick }}  // text-[10px]
/>
```

### TimelineItem
```tsx
<TimelineItem
  icon={DollarSign}          // w-3.5 h-3.5 em container w-7 h-7
  title="..."                // text-xs font-semibold
  description="..."          // text-xs
  time="há 5 min"            // text-[10px]
  colorScheme="emerald"
/>
```

### QuickActionButton
```tsx
<QuickActionButton
  icon={Sparkles}
  label="Comando IA"         // text-xs (highlight) ou text-[11px] (normal)
  onClick={() => {}}
  variant="highlight"        // gradient ou border-slate-200
/>
```

---

## Layout Grid

```tsx
// Dashboard 3 Colunas
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
  <div className="xl:col-span-3">...</div>  // Esquerda 25%
  <div className="xl:col-span-5">...</div>  // Centro 42%
  <div className="xl:col-span-4">...</div>  // Direita 33%
</div>

// KPIs 2x2
<div className="grid grid-cols-2 gap-4">...</div>

// Ações Rápidas 8 colunas
<div className="grid grid-cols-8 gap-2.5">...</div>
```

---

## Checklist Novo Módulo

- [ ] Cores da paleta do sistema (#34495e, #46627f, #89bcbe, slate)
- [ ] Tipografia: text-2xl KPIs, text-sm cards, text-xs labels
- [ ] Ícones: 32px/16px (KPI), 28px/14px (timeline)
- [ ] Espaçamento: gap-6 seções, gap-4 cards, py-2.5 px-3 botões
- [ ] Componentes: MetricCard, InsightCard, TimelineItem, QuickActionButton
- [ ] Bordas: border-slate-200, rounded-lg
- [ ] Sombras: shadow-sm padrão, shadow-lg hover
- [ ] Grid: xl:grid-cols-12 para desktop
- [ ] Hover states sutis
- [ ] Mobile-first responsive

---

**Referência Completa:** Ver 02-dashboard.md para detalhes de implementação
