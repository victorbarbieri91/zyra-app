# Sistema de Design - Zyra Legal
## Análise de Referências e Novo Sistema

### Referências Analisadas

#### 1. Swapy Draggable Card (21st.dev)
- **Cards coloridos com fundos vibrantes**: emerald-600, fuchsia-600, blue-600, purple-500, pink-500, yellow-500
- **Estrutura**: Título + número grande + descrição + ícone
- **Características**: Sombras suaves, bordas arredondadas, gradientes sutis

#### 2. Statistics Card 2 (21st.dev)
- **Fundos escuros/coloridos**: zinc-950, fuchsia-600, blue-600, teal-600
- **Decoração SVG**: Padrões geométricos em overlay com opacidade
- **Números grandes e bold** com texto secundário em opacity reduzida
- **Icons em circles com backdrop-blur**

#### 3. Dribbble Analytics Dashboards (2025)
- **Gradientes modernos**: from-purple-500 to-pink-500, from-blue-500 to-cyan-400
- **Cards com personalidade**: Cada métrica tem cor própria
- **Micro-interações**: Hover effects, animações suaves
- **Hierarquia visual clara**: Cards hero maiores, secundários menores

---

## Novo Sistema de Cores Zyra Legal

### Paleta Padrão

```css
/* Cores Principais */
--primary-light: #aacfd0;
--primary-main: #89bcbe;
--primary-dark: #46627f;
--primary-contrast-text: #ffffff;

/* Cores Secundárias */
--secondary-light: #cbe2e2;
--secondary-main: #34495e;
--secondary-dark: #2c3e50; /* Variação mais escura de #34495e */
--secondary-contrast-text: #ffffff;

/* Cores Neutras */
--white: #ffffff;
--grey-100: #f8f9fa;
--grey-200: #e9ecef;
--grey-300: #dee2e6;
```

### Cores Funcionais

```css
/* Background hierarchy */
--bg-primary: #f8f9fa;        /* Fundo principal - grey-100 */
--bg-secondary: #ffffff;      /* Cards - white */
--bg-tertiary: #e9ecef;       /* Áreas secundárias - grey-200 */

/* Text hierarchy */
--text-primary: #34495e;      /* Títulos - secondary-main */
--text-secondary: #46627f;    /* Subtítulos - primary-dark */
--text-tertiary: #89bcbe;     /* Auxiliar - primary-main */
--text-muted: #cbe2e2;        /* Desabilitado - secondary-light */

/* Borders */
--border-light: #F1F5F9      /* slate-100 */
--border-default: #E2E8F0    /* slate-200 */
--border-strong: #CBD5E1     /* slate-300 */

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)
--shadow-colored: 0 10px 25px -5px rgba(99, 102, 241, 0.15)
```

---

## Componentes do Dashboard

### 1. Card Hero (Resumo do Dia)
```
- Background: Gradiente Sapphire (600 → 700)
- Pattern SVG: Grid pattern white com opacity 10%
- Icon badge: white/20 backdrop-blur
- Text: white com hierarquia através de opacity
- Shadow: colored shadow sapphire
- Padding: 24px (p-6)
- Border radius: 16px (rounded-xl)
```

### 2. KPI Cards (6 métricas principais)
```
Layout: Grid 3 colunas
Cada card com cor própria:
- Processos: Sapphire gradient
- Clientes: Emerald gradient
- Consultas: Blue gradient
- A Receber: Amber gradient
- Recebido: Teal gradient
- Taxa Sucesso: Purple gradient

Estrutura:
- Background: Gradiente colorido + white overlay 95%
- Icon: Circle com bg da cor em 100 opacity
- Número: text-3xl font-bold white
- Label: text-sm white/90
- Change badge: Pequeno badge com arrow
- Hover: Scale 1.02 + shadow-xl
```

### 3. Números do Mês (Sidebar)
```
- Background: White card
- Progress bars: Gradientes coloridos
  - Horas: Sapphire gradient
  - Taxa: Emerald gradient
  - Receita: Blue gradient
- Animação: Width transition com delay escalonado
- CTA button: Gradient background
```

### 4. Metas Card
```
- Icon badge no header: Sapphire bg-100 text-600
- Progress items: Cada um em card interno (bg-slate-50)
- Progress bars com gradientes por tipo
- Números tabular-nums para alinhamento
```

### 5. Performance Equipe
```
- Background: White
- Highlight row (Você): bg-sapphire-50 border-sapphire-200
- Progress bars: Gradient quando highlight, gray quando normal
- Revenue em destaque
```

### 6. Insights de Gestão
```
- Icon badge: Sapphire
- Cards coloridos por tipo:
  - Success: bg-emerald-50 text-emerald-700
  - Warning: bg-amber-50 text-amber-700
  - Info: bg-blue-50 text-blue-700
  - Alert: bg-red-50 text-red-700
- Hover: bg darker
```

### 7. Ações Rápidas
```
- CTA principal (Centro Comando): Gradient sapphire full width
- Grid 2x4: Cards bg-slate-50 hover:bg-slate-100
- Icons + labels verticalmente alinhados
- Micro hover animation: scale 1.02
```

### 8. Agenda & Para Acompanhar
```
- Timeline items: Hover bg-slate-50
- Badges coloridos por tipo evento
- Time em fixed width para alinhamento
- Truncate text em títulos longos
```

---

## Typography

### Font Stack
```
font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

### Sizes & Weights
```
- Hero numbers: text-4xl font-bold (36px, 700)
- KPI numbers: text-3xl font-bold (30px, 700)
- Card numbers: text-2xl font-semibold (24px, 600)
- Headers: text-sm font-semibold (14px, 600)
- Body: text-sm font-normal (14px, 400)
- Labels: text-xs font-medium (12px, 500)
- Captions: text-xs font-normal (12px, 400)
```

### Line Heights
```
- Tight: leading-tight (1.25)
- Normal: leading-normal (1.5)
- Relaxed: leading-relaxed (1.625)
```

---

## Spacing System

```
xs: 4px   (0.5)
sm: 8px   (2)
md: 12px  (3)
lg: 16px  (4)
xl: 20px  (5)
2xl: 24px (6)
3xl: 32px (8)
```

---

## Animations

### Transitions
```
duration-150: 150ms (micro-interactions)
duration-200: 200ms (hover states)
duration-300: 300ms (modal, drawer)
duration-500: 500ms (page transitions)
```

### Easing
```
ease-out: cubic-bezier(0, 0, 0.2, 1) - saída suave
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1) - entrada/saída
spring: cubic-bezier(0.16, 1, 0.3, 1) - bounce suave
```

### Framer Motion Patterns
```
Initial: { opacity: 0, y: 20 }
Animate: { opacity: 1, y: 0 }
Transition: { duration: 0.3, ease: "easeOut" }
Stagger: delay: index * 0.05

Hover: { y: -4, scale: 1.02 }
Tap: { scale: 0.98 }
```

---

## Implementação - Ordem de Rebuild

### Fase 1: Globals CSS
✓ Definir variáveis de cor completas
✓ Criar classes utilitárias para gradientes
✓ Adicionar animations keyframes
✓ Setup de custom shadows

### Fase 2: Dashboard - Layout Base
1. Container principal com bg-slate-50
2. Grid 12 colunas responsivo
3. Spacing consistente (gap-6)

### Fase 3: Dashboard - Hero Cards
1. Resumo do Dia (gradient sapphire + pattern)
2. 6 KPI Cards (cada um com gradient próprio)
3. Animações de entrada

### Fase 4: Dashboard - Sidebar Cards
1. Seus Números (progress bars animados)
2. Metas (mini cards internos)
3. Agenda de Hoje
4. Para Acompanhar

### Fase 5: Dashboard - Centro
1. Performance Equipe
2. Insights de Gestão
3. Ações Rápidas

### Fase 6: Login Page Rebuild
1. Split screen com ilustração
2. Form com gradientes sutis
3. Animações de entrada
4. Estados de loading

---

## Diferenciais do Novo Design

✅ **Cores vibrantes mas profissionais** - Cada métrica tem personalidade
✅ **Gradientes modernos** - Não é flat, tem profundidade
✅ **Hierarquia visual clara** - Olho sabe onde ir primeiro
✅ **Micro-interações** - Hover, tap, animações suaves
✅ **Consistência** - Sistema de design documentado
✅ **Performance** - CSS moderno, animações GPU-accelerated
✅ **Responsivo** - Mobile-first approach

---

## Diferenças vs Versão Anterior (Rejeitada)

### ❌ Anterior
- Cores muito sutis (slate-200, slate-300)
- Tudo branco/cinza - sem personalidade
- Icons pequenos sem destaque
- Sem gradientes ou profundidade
- Cards todos iguais
- Parecia wireframe

### ✅ Novo
- Gradientes vibrantes por card
- Cada métrica tem cor própria
- Icons em badges coloridos destacados
- Profundidade com shadows e gradientes
- Variedade visual - não é monotônico
- Parece produto final polido
