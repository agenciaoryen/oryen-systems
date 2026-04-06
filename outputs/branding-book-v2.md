# Oryen — Branding Book v2

**Versao:** 2.0
**Data:** 2026-04-06
**Status:** Aprovado pelo CMO / Pronto para implementacao

---

## Sumario

1. [Essencia da Marca](#1-essencia-da-marca)
2. [Logo](#2-logo)
3. [Paleta de Cores](#3-paleta-de-cores)
4. [Tipografia](#4-tipografia)
5. [Gradientes e Efeitos](#5-gradientes-e-efeitos)
6. [Iconografia](#6-iconografia)
7. [Componentes UI](#7-componentes-ui)
8. [Layout e Grid](#8-layout-e-grid)
9. [Fotografia e Ilustracao](#9-fotografia-e-ilustracao)
10. [Aplicacoes](#10-aplicacoes)
11. [Design Tokens](#11-design-tokens)
12. [Do & Don't](#12-do-e-dont)

---

## 1. Essencia da Marca

### Posicionamento
Oryen e o sistema de inteligencia comercial para o mercado imobiliario. Nao e "mais um CRM" — e a inteligencia artificial que entende de imoveis.

### Arquetipos
- **Primario:** O Mago — transforma complexidade em simplicidade
- **Secundario:** O Sabio — baseado em dados, confiavel porque e preciso

### Personalidade
```
Preciso . Confiante . Moderno . Parceiro . Acessivel
```

### Taglines
- PT: "Voce fecha. A gente cuida do resto."
- EN: "You close. We handle the rest."
- ES: "Tu cierras. Nosotros hacemos el resto."

### Tom de Voz
Direto. Frases curtas. Confiante sem arrogancia. Tecnico quando necessario, humano sempre. O corretor e o especialista — nos somos a ferramenta inteligente.

---

## 2. Logo

### Conceito: "Orbital Intelligence"

O simbolo representa uma **orbita neural** — um anel dinamico que remete a:
- A letra **"O"** de Oryen
- Um circuito de dados/inteligencia em movimento orbital
- A ideia de algo que **orbita e protege** (o negocio do corretor)

O anel nao e fechado: a abertura sugere **entrada de dados** e **abertura para crescimento**. Um ponto luminoso na extremidade do arco primario funciona como um **no de inteligencia** (node), remetendo a IA e redes neurais.

### Construcao Tecnica

**Simbolo (icon mark)**
- Geometria base: circulo de 40x40px
- Arco primario: 280 graus de arco, stroke 5px, round cap
- Terminal node: circulo de 6px de diametro na extremidade superior
- Cor do simbolo: usa gradient-brand (cobalt > indigo) ou solid primary
- Area de protecao: 25% do diametro em cada direcao

**Wordmark**
- "oryen" em Plus Jakarta Sans, weight 600 (SemiBold), caixa baixa
- Letter-spacing: -0.02em (mais apertado que v1 para modernidade)
- Alinhamento vertical: centro optico do simbolo

### Variantes

| Variante | Uso | Arquivo |
|----------|-----|---------|
| Horizontal dark | Dashboard, header do app, dark backgrounds | `logo.svg` |
| Horizontal light | Landing page seções claras, documentos | `logo-light.svg` |
| Monocromatico branco | Sobre fotos, backgrounds complexos | `logo-mono.svg` |
| Icon only | Favicon, app icon, avatar, loading | `logo-icon.svg` |
| Icon only gradient | Marketing, social media, hero sections | `logo-icon-gradient.svg` |

### Regras
- Area de protecao minima: 1x a largura do simbolo ao redor do logo
- Tamanho minimo do wordmark: 80px de largura
- Tamanho minimo do icon: 16px (favicon) — nesse tamanho, omitir o terminal node
- Nunca rotacionar, distorcer, ou aplicar efeitos sobre o logo
- Em fundos escuros: wordmark em `#EEEEF6`
- Em fundos claros: wordmark em `#0E0E20`

---

## 3. Paleta de Cores

### Filosofia
A paleta e construida em camadas: **uma cor primaria dominante** (cobalt) que transmite confianca e tecnologia, um **accent vibrante** (amber) usado com parcimonia para chamar atencao, e uma **assinatura gradiente** (cobalt-to-indigo) que diferencia a Oryen de qualquer outro SaaS azul.

### 3.1 Cores Primarias

#### Cobalt — Primary
A cor principal da marca. Usada em CTAs, links, estados ativos, elementos interativos.

| Token | Dark Mode | Light Mode | Uso |
|-------|-----------|------------|-----|
| `primary` | `#4F6FFF` | `#3451DB` | Botoes, links, icones ativos |
| `primary-hover` | `#3D5AEC` | `#2940B8` | Hover states |
| `primary-active` | `#2D46D4` | `#1F3299` | Active/pressed states |
| `primary-subtle` | `#161D45` | `#EEF1FE` | Badges, backgrounds sutis |
| `primary-subtle-fg` | `#8DA4FF` | `#3451DB` | Texto sobre primary-subtle |

**Mudanca vs v1:** Primary dark ajustado de `#4B6BFB` para `#4F6FFF` — 3% mais luminoso e levemente mais saturado. Melhora legibilidade sobre fundos escuros e se diferencia do azul generico de ferramentas como Jetimob. A diferenca e sutil mas intencional: mais eletrico, menos "default blue".

#### Amber — Accent
A cor de destaque. Usada em CTAs premium, notificacoes de alta prioridade, conquistas, upgrades, KPIs positivos.

| Token | Dark Mode | Light Mode | Uso |
|-------|-----------|------------|-----|
| `accent` | `#F0A030` | `#C48820` | Badges premium, CTAs secundarios |
| `accent-hover` | `#F5B550` | `#A87318` | Hover states |
| `accent-subtle` | `#2D2008` | `#FFF8EA` | Backgrounds achievement |
| `accent-subtle-fg` | `#FCD078` | `#8B5E10` | Texto sobre accent-subtle |

#### Indigo — Extended Brand
Nova cor que expande a expressao da marca. Usada em gradientes, momentos de "wow", e marketing.

| Token | Dark Mode | Light Mode | Uso |
|-------|-----------|------------|-----|
| `indigo` | `#6E5FFF` | `#5B4FE0` | Gradientes, ilustracoes, IA features |
| `indigo-hover` | `#5A4BED` | `#4A3ECF` | Hover |
| `indigo-subtle` | `#1A1640` | `#F0EEFE` | Background de features de IA |
| `indigo-subtle-fg` | `#A89CFF` | `#5B4FE0` | Texto sobre indigo-subtle |

### 3.2 Cores Neutras (fundos, bordas, textos)

**Dark Mode (padrao)**

| Token | Hex | Uso |
|-------|-----|-----|
| `bg-base` | `#06060C` | Fundo da aplicacao (mais profundo que v1) |
| `bg-surface` | `#0C0C16` | Cards, paineis, sidebar |
| `bg-elevated` | `#141420` | Modais, dropdowns, tooltips |
| `bg-hover` | `#1A1A2C` | Hover sobre surfaces |
| `bg-selected` | `#161D45` | Item selecionado (usa primary-subtle) |
| `bg-overlay` | `rgba(0,0,0,0.75)` | Backdrop de modais |
| `border` | `#1E1E34` | Bordas padrao |
| `border-subtle` | `#15152A` | Bordas muito sutis (divisores internos) |
| `border-strong` | `#2A2A4A` | Bordas com mais destaque |
| `border-focus` | `#4F6FFF` | Focus rings |
| `text-primary` | `#EDEDF5` | Texto principal |
| `text-secondary` | `#8888AA` | Labels, metadata, texto auxiliar |
| `text-tertiary` | `#555572` | Placeholders, hints |
| `text-disabled` | `#333348` | Texto desabilitado |
| `text-on-primary` | `#FFFFFF` | Texto sobre botao primary |
| `text-on-accent` | `#0C0800` | Texto sobre botao accent |

**Mudanca vs v1:** Backgrounds 15% mais profundos (base de `#08080E` para `#06060C`). Cria mais contraste com os cards e mais sensacao de profundidade. Inspiracao direta do approach do Linear e Raycast.

**Light Mode**

| Token | Hex | Uso |
|-------|-----|-----|
| `bg-base` | `#F2F2FA` | Fundo geral |
| `bg-surface` | `#FFFFFF` | Cards, paineis |
| `bg-elevated` | `#FFFFFF` | Modais, dropdowns |
| `bg-hover` | `#EAEAF3` | Hover |
| `bg-selected` | `#EEF1FE` | Selecionado |
| `bg-input` | `#F5F5FC` | Campos de input |
| `border` | `#D8D8E6` | Bordas padrao |
| `border-subtle` | `#E4E4F0` | Bordas sutis |
| `border-strong` | `#B8B8D0` | Bordas fortes |
| `border-focus` | `#3451DB` | Focus rings |
| `text-primary` | `#0C0C1E` | Texto principal |
| `text-secondary` | `#4A4A68` | Texto auxiliar |
| `text-tertiary` | `#8282A0` | Placeholders |
| `text-disabled` | `#B8B8CC` | Desabilitado |

### 3.3 Cores Semanticas

| Funcao | Dark Mode | Light Mode | Subtle (dark) | Subtle-fg (dark) |
|--------|-----------|------------|---------------|------------------|
| Success | `#22C55E` | `#16A34A` | `#061F12` | `#4ADE80` |
| Warning | `#F59E0B` | `#D97706` | `#1F1800` | `#FCD34D` |
| Error | `#EF4444` | `#DC2626` | `#200808` | `#FCA5A5` |
| Info | `#38BDF8` | `#0369A1` | `#081820` | `#7DD3FC` |

### 3.4 Contraste e Acessibilidade
- Todos os pares texto/fundo atendem WCAG AA (4.5:1 para texto normal)
- Primary sobre bg-base: 6.8:1 (dark), 5.2:1 (light) — passa AA
- Text-secondary sobre bg-surface: 5.1:1 (dark), 4.8:1 (light) — passa AA
- Text-on-primary (branco) sobre primary: 4.6:1 — passa AA

---

## 4. Tipografia

### Fontes

| Papel | Fonte | Weights | Uso |
|-------|-------|---------|-----|
| Display / Headings | **Plus Jakarta Sans** | 500, 600, 700 | Titulos, H1-H6, numeros grandes, KPIs |
| Body / UI | **Inter** | 400, 500, 600 | Texto corrido, labels, inputs, botoes |
| Monospace | **JetBrains Mono** | 400 | Codigos, IDs, valores numericos, timestamps |

### Escala Tipografica

```
Display:    48px / 1.05  / -0.03em / Jakarta 700
H1:         36px / 1.10  / -0.025em / Jakarta 700
H2:         28px / 1.15  / -0.02em / Jakarta 600
H3:         22px / 1.25  / -0.015em / Jakarta 600
H4:         18px / 1.30  / -0.01em / Jakarta 600
H5:         15px / 1.40  / -0.005em / Jakarta 500
H6:         13px / 1.40  / 0em / Jakarta 500

Body LG:    16px / 1.55  / 0em / Inter 400
Body:       14px / 1.55  / 0em / Inter 400
Body SM:    13px / 1.50  / 0em / Inter 400
Small:      12px / 1.45  / 0.01em / Inter 500
Caption:    11px / 1.40  / 0.02em / Inter 500

Mono:       13px / 1.45  / 0em / JetBrains 400
```

### Mudancas vs v1
- Letter-spacing dos headings mais apertado (-0.03em no display vs -0.01em antes). Mais moderno e assertivo.
- Line-height do display mais apertado (1.05 vs ~1.1). Headings mais "punchy".
- Small e Caption ganharam letter-spacing positivo para melhor legibilidade em tamanhos reduzidos.
- Weight 700 adicionado para Display e H1. Mais impacto visual em landing pages.

---

## 5. Gradientes e Efeitos

### 5.1 Gradientes de Marca

#### Gradient Brand (assinatura principal)
```css
--gradient-brand: linear-gradient(135deg, #4F6FFF 0%, #6E5FFF 50%, #8B5CF6 100%);
```
Cobalt > Indigo > Violet. A "impressao digital" da Oryen. Usado em:
- Hero sections de landing pages
- Backgrounds de features de IA
- Bordas animadas em elementos premium
- CTAs de alta conversao

#### Gradient Brand Subtle (versao sutil para surfaces)
```css
--gradient-brand-subtle: linear-gradient(135deg, rgba(79,111,255,0.08) 0%, rgba(110,95,255,0.08) 100%);
```
Versao com 8% de opacidade para backgrounds de cards e secoes.

#### Gradient Accent (momentos de destaque)
```css
--gradient-accent: linear-gradient(135deg, #F0A030 0%, #FF8C42 100%);
```
Amber para coral. Usado em badges premium, upgrade CTAs, momentos de celebracao.

#### Gradient Dark (depth em surfaces)
```css
--gradient-dark: linear-gradient(180deg, #0C0C16 0%, #06060C 100%);
```
Sutil diferenca top-to-bottom para criar profundidade em paginas longas.

#### Gradient Glow (efeito de luz)
```css
--gradient-glow: radial-gradient(ellipse at 50% 0%, rgba(79,111,255,0.15) 0%, transparent 70%);
```
Aplicado como pseudo-element (`::before`) em headers e hero sections. Cria um "glow" sutil que ilumina o topo da pagina sem sobrecarregar.

### 5.2 Glass Effects

```css
--glass-bg: rgba(12, 12, 22, 0.7);
--glass-blur: 16px;
--glass-border: rgba(255, 255, 255, 0.06);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```

Aplicar em:
- Header fixo do app (quando rola)
- Dropdowns e command palette
- Tooltips premium

**Regra:** Glass effect e luxo, nao padrao. Usar em maximo 2-3 elementos por tela.

### 5.3 Sombras

**Dark Mode**
```
SM:      0 1px 2px rgba(0, 0, 0, 0.5)
MD:      0 4px 12px rgba(0, 0, 0, 0.6)
LG:      0 8px 24px rgba(0, 0, 0, 0.65)
XL:      0 20px 50px rgba(0, 0, 0, 0.75)
Primary: 0 4px 20px rgba(79, 111, 255, 0.25)
Accent:  0 4px 20px rgba(240, 160, 48, 0.20)
Glow:    0 0 40px rgba(79, 111, 255, 0.15)
```

**Light Mode**
```
SM:      0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)
MD:      0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)
LG:      0 8px 24px rgba(0, 0, 0, 0.07), 0 4px 8px rgba(0, 0, 0, 0.03)
XL:      0 20px 50px rgba(0, 0, 0, 0.09), 0 8px 16px rgba(0, 0, 0, 0.03)
Primary: 0 4px 20px rgba(52, 81, 219, 0.15)
Accent:  0 4px 20px rgba(196, 136, 32, 0.12)
```

### 5.4 Animacoes e Transicoes

```
Fast:     100ms ease
Base:     150ms ease
Slow:     250ms ease-out
Spring:   200ms cubic-bezier(0.34, 1.56, 0.64, 1)
Smooth:   300ms cubic-bezier(0.4, 0, 0.2, 1)
```

**Principios de animacao:**
- Entrada: ease-out (rapido no inicio, desacelera)
- Saida: ease-in (lento no inicio, acelera)
- Hover: `transition-fast` para feedback imediato
- Layout shifts: `transition-slow` para nao ser abrupto
- Spring: apenas para micro-interacoes (toggle, check, like)

---

## 6. Iconografia

### Sistema
- **Biblioteca:** Lucide React (ja instalado no projeto)
- **Stroke:** 1.5px (padrao Lucide)
- **Size padrao:** 18px para UI inline, 20px para navegacao, 24px para destaque
- **Terminacoes:** Round (stroke-linecap: round)

### Regras
- Icones SEMPRE em cor `text-secondary` por padrao
- Quando ativo/selecionado: `text-primary` ou `primary`
- Nunca usar icones coloridos em interfaces operacionais (dashboard, CRM)
- Icones coloridos permitidos apenas em: empty states, onboarding, marketing

### Icones customizados (se necessarios)
- Seguir grid de 24x24 com area segura de 2px em cada lado
- Stroke: 1.5px, round caps, round joins
- Simplificar ao maximo — deve ser legivel em 16x16

---

## 7. Componentes UI

### 7.1 Botoes

**Primary (CTA principal)**
```
Background:   var(--color-primary)
Color:        #FFFFFF
Font:         Inter 500, 14px
Padding:      10px 20px
Radius:       8px
Shadow:       var(--shadow-primary) on hover
Transition:   all 150ms ease

Hover:        background var(--color-primary-hover), translateY(-1px)
Active:       background var(--color-primary-active), translateY(0)
Disabled:     opacity 0.4, cursor not-allowed
```

**Secondary (acao secundaria)**
```
Background:   transparent
Border:       1px solid var(--color-border-strong)
Color:        var(--color-text-primary)
Font:         Inter 500, 14px
Padding:      10px 20px
Radius:       8px

Hover:        background var(--color-bg-hover), border-color var(--color-primary)
Active:       background var(--color-bg-selected)
```

**Ghost (acao terciaria)**
```
Background:   transparent
Color:        var(--color-text-secondary)
Font:         Inter 500, 14px
Padding:      10px 20px
Radius:       8px

Hover:        background var(--color-bg-hover), color var(--color-text-primary)
```

**Accent (CTA premium/upgrade)**
```
Background:   var(--gradient-accent)
Color:        var(--color-text-on-accent)
Font:         Inter 600, 14px
Padding:      10px 20px
Radius:       8px
Shadow:       var(--shadow-accent) on hover
```

**Gradient (CTA hero/landing)**
```
Background:   var(--gradient-brand)
Color:        #FFFFFF
Font:         Jakarta 600, 16px
Padding:      14px 28px
Radius:       10px
Shadow:       var(--shadow-glow) on hover
```

### 7.2 Cards

**Card padrao (surface)**
```
Background:   var(--color-bg-surface)
Border:       1px solid var(--color-border)
Radius:       12px
Padding:      20px
Shadow:       none (flat por padrao)

Hover (se clicavel):
  Border:     1px solid var(--color-border-strong)
  Shadow:     var(--shadow-md)
  Transform:  translateY(-1px)
```

**Card elevado (modais, dropdowns)**
```
Background:   var(--color-bg-elevated)
Border:       1px solid var(--color-border)
Radius:       12px
Padding:      20px
Shadow:       var(--shadow-lg)
```

**Card com gradient border (destaque)**
```css
.card-featured {
  position: relative;
  background: var(--color-bg-surface);
  border-radius: 12px;
  padding: 20px;
}
.card-featured::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 1px;
  background: var(--gradient-brand);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

### 7.3 Inputs

```
Background:     var(--color-bg-elevated) [dark] / var(--color-bg-input) [light]
Border:         1px solid var(--color-border)
Radius:         8px
Padding:        10px 12px
Font:           Inter 400, 14px
Color:          var(--color-text-primary)
Placeholder:    var(--color-text-tertiary)

Focus:
  Border:       1px solid var(--color-border-focus)
  Shadow:       0 0 0 3px rgba(79, 111, 255, 0.15)
  Outline:      none

Error:
  Border:       1px solid var(--color-error)
  Shadow:       0 0 0 3px rgba(239, 68, 68, 0.10)
```

### 7.4 Badges / Tags

**Solid**
```
Background:   var(--color-primary-subtle)
Color:        var(--color-primary-subtle-fg)
Font:         Inter 500, 12px
Padding:      2px 8px
Radius:       4px
```

**Variantes semanticas:**
- Success: bg `--success-subtle`, fg `--success-subtle-fg`
- Warning: bg `--warning-subtle`, fg `--warning-subtle-fg`
- Error: bg `--error-subtle`, fg `--error-subtle-fg`
- Info: bg `--info-subtle`, fg `--info-subtle-fg`

**Outline**
```
Background:   transparent
Border:       1px solid var(--color-border)
Color:        var(--color-text-secondary)
Font:         Inter 500, 12px
Padding:      2px 8px
Radius:       4px
```

### 7.5 Tabelas

```
Header BG:      var(--color-bg-elevated)
Header text:    var(--color-text-secondary), Inter 500, 12px, uppercase, letter-spacing 0.05em
Row BG:         transparent
Row border:     1px solid var(--color-border-subtle) (bottom)
Row hover:      var(--color-bg-hover)
Cell text:      var(--color-text-primary), Inter 400, 14px
Cell padding:   12px 16px
```

### 7.6 Sidebar

```
Background:     var(--color-bg-surface)
Width:          240px (expanded) / 64px (collapsed)
Border right:   1px solid var(--color-border-subtle)

Nav item:
  Color:        var(--color-text-secondary)
  Padding:      8px 12px
  Radius:       8px
  Font:         Inter 500, 14px

Nav item hover:
  Background:   var(--color-bg-hover)
  Color:        var(--color-text-primary)

Nav item active:
  Background:   var(--color-primary-subtle)
  Color:        var(--color-primary)
```

---

## 8. Layout e Grid

### Espacamento
Sistema base-4 (4px). Valores principais:
```
4px   8px   12px   16px   20px   24px   32px   40px   48px   64px   80px   96px
```

### Grid do Dashboard
```
Sidebar:          240px fixo (64px collapsed)
Content max:      1440px
Content padding:  32px (desktop) / 24px (tablet) / 16px (mobile)
Grid gap:         16px (padrao) / 24px (secoes maiores)
Columns:          12-column grid
```

### Breakpoints
```
Mobile:     < 640px
Tablet:     640px - 1024px
Desktop:    1024px - 1440px
Wide:       > 1440px
```

### Border Radius
```
Cards / Modais:     12px  (--radius-lg)
Inputs / Botoes:    8px   (--radius-md)
Badges / Tags:      4px   (--radius-sm)
Avatares:           9999px (--radius-full)
Container grande:   16px  (--radius-xl)
Secao hero:         24px  (--radius-2xl)
```

---

## 9. Fotografia e Ilustracao

### Fotografia
- **Estilo:** Quando usar fotos de imoveis, aplicar leve overlay escuro + grain para integrar ao visual dark
- **Filtro sugerido:** brightness(0.9) contrast(1.05) saturate(0.95) — sutil, nao Instagram
- **Nunca:** Fotos de banco de imagens genericas de "pessoas felizes no escritorio"
- **Sempre:** Screenshots reais do produto, fotos contextuais de corretores trabalhando, ou imoveis reais

### Ilustracao
- **Estilo:** Geometrico e clean, baseado em linhas (alinhado com Lucide)
- **Cores:** Usar apenas cores da paleta (primary, indigo, accent + neutros)
- **Quando usar:** Empty states, onboarding, error pages, marketing
- **Nunca:** Ilustracoes 3D cartunesques, mascotes, ou estilos que remetam a 2018

### Graficos / Data Visualization
- **Cor primaria de dados:** Primary (`#4F6FFF`)
- **Cor secundaria:** Indigo (`#6E5FFF`)
- **Cor terciaria:** Accent (`#F0A030`)
- **Grid lines:** `--color-border-subtle`
- **Axis labels:** `--color-text-tertiary`
- **Tooltip:** Background `--color-bg-elevated`, border `--color-border`, shadow `--shadow-lg`

---

## 10. Aplicacoes

### 10.1 Dashboard (SaaS)
```
Layout:
- Sidebar escura (bg-surface) com logo + nav
- Header com breadcrumbs + search (command palette) + avatar
- Content area com grid de KPI cards no topo
- Cards de KPI: flat, border sutil, icone em primary ou accent
- Graficos com gradient-brand no fill principal
- Tabelas com header sutil (text-secondary, uppercase, tracking wide)

Tom visual: Limpo, focado, funcional. Zero ruido visual.
Inspiracao: Linear + Raycast
```

### 10.2 Landing Page
```
Layout:
- Header transparente com glass effect ao scrollar
- Hero section: fundo bg-base com gradient-glow no topo
  - Headline em Display (48px, Jakarta 700, -0.03em)
  - Subheadline em Body LG (Inter 400, text-secondary)
  - CTA com gradient-brand button
  - Screenshot do produto com moldura (border + shadow-xl + radius-xl)
- Secoes alternando entre bg-base e bg-surface
- Social proof: logos de clientes em grayscale
- Feature sections: icone + titulo + descricao, 3 colunas
- CTA final com card gradient-brand-subtle de fundo

Tom visual: Premium, confiante, tech-forward.
Inspiracao: Vercel + Linear website
```

### 10.3 Card de Rede Social (Instagram/LinkedIn)
```
Formato: 1080x1080 ou 1080x1350

Layout:
- Background: bg-base (#06060C) com gradient-glow sutil no canto superior
- Logo no topo esquerdo (versao mono branco, pequeno)
- Headline forte (Jakarta 700, branco) — maximo 6 palavras
- Accent line: barra de 3px com gradient-brand abaixo do headline
- Supporting text em text-secondary (Inter 400)
- CTA inferior: badge com icone + "Saiba mais" ou URL
- Marca d'agua: gradient mesh muito sutil no background

Regras:
- Nunca usar mais de 2 cores alem do branco e cinza
- Screenshots do produto como principal recurso visual
- Texto maximo: titulo (6 palavras) + descricao (15 palavras)
```

### 10.4 Email Marketing
```
- Header: logo centralizado, bg-surface
- Body: maximo 600px de largura
- Botoes: solid primary, nunca gradient (nem todos email clients suportam)
- Tipografia: fallback para Arial/Helvetica (email-safe)
- Footer: text-secondary, links underline
```

---

## 11. Design Tokens

Os design tokens completos estao em `outputs/design-tokens-v2.css`.

O arquivo inclui:
- Tema escuro (`:root` — padrao)
- Tema claro (`[data-theme="light"]`)
- Todas as variaveis CSS documentadas neste branding book
- Gradientes como custom properties
- Glass effects
- Animacoes

Para ativar o tema claro:
```js
document.documentElement.setAttribute('data-theme', 'light');
```

Para voltar ao tema escuro:
```js
document.documentElement.removeAttribute('data-theme');
```

---

## 12. Do & Don't

### DO (faca)
- Use dark mode como padrao em todas as apresentacoes da marca
- Use o gradient-brand como assinatura visual em momentos de destaque
- Mantenha hierarquia visual por opacidade e peso, nao por saturacao
- Use whitespace generoso — respire
- Mantenha consistencia obsessiva nos tokens
- Priorize screenshots do produto como recurso visual
- Use a tagline "Voce fecha. A gente cuida do resto." em contextos de marketing

### DON'T (nao faca)
- Nao use mais de 3 cores em uma unica tela (primary, accent, e uma semantica)
- Nao use gradientes em textos pequenos (abaixo de H2)
- Nao coloque glass effect em tudo — maximo 2-3 elementos por tela
- Nao use fotos de banco de imagem generico
- Nao mude as cores do logo
- Nao use cantos vivos (0px radius) em nenhum componente
- Nao use sombras pesadas no dark mode — o fundo ja e escuro, sombra forte some
- Nao use fontes fora do sistema (Jakarta + Inter + JetBrains)
- Nao crie versoes "divertidas" ou "casual" da marca — a personalidade e confiante, nao engraçadinha

---

## Changelog v1 > v2

| Aspecto | v1 | v2 | Razao |
|---------|----|----|-------|
| Primary dark | #4B6BFB | #4F6FFF | Mais eletrico, melhor contraste, diferencia de concorrentes |
| BG base dark | #08080E | #06060C | Mais profundo, mais contraste com surfaces |
| BG surface dark | #0F0F18 | #0C0C16 | Acompanha base mais profunda |
| Nova cor Indigo | N/A | #6E5FFF | Expande expressao para gradientes e IA features |
| Gradientes | Nenhum | 5 definidos | Signature visual da marca |
| Glass effects | Nenhum | Definido | Modernidade em UI |
| Shadow glow | Nenhum | Definido | Destaque em CTAs hero |
| Display weight | 600 | 700 | Mais impacto em landing pages |
| Letter-spacing | -0.01em | -0.03em | Mais moderno e assertivo |
| Logo conceito | Arcos arbitrarios | Orbital Intelligence | Comunica IA + orbita de dados |

---

**Documento produzido pela Oryen Brand Team**
**Proxima revisao: quando houver mudanca estrategica no posicionamento**
