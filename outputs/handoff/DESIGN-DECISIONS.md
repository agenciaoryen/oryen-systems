# Decisões de design — Pipeline Híbrido

Contexto curto: o objetivo foi pegar a base **Refinada** (limpa, escaneável, tipo
Linear/Attio) e injetar **3 elementos editoriais** que dão personalidade sem virar
um "dossiê" pesado. Nada além disso muda na tela.

## O que é "híbrido", concretamente

### 1. Cabeçalho da página

**Antes:** Título simples "Pipeline de Negócios" + subtítulo "Sincronizado em tempo real".

**Agora:**
- **Kicker monoespaçado** acima do título: `DOSSIÊ · 03 · CRM` em `font-mono uppercase tracking-uppercase` cor `text-text-tertiary`.
- **Título grande com barra editorial:** `Pipeline <span class="text-text-tertiary font-light">/</span> Negócios` em `font-display text-h1`.
- **Linha de stats inline** à direita do título: `247 contatos · R$ 1.84M em pipeline · 18 fechados este mês` — número em `font-mono text-text-primary`, label em `text-text-tertiary`.

> Por quê: dá identidade na primeira tela sem pedir mais espaço vertical.

### 2. Topo de cada coluna do Kanban

**Antes:** Header simples com o nome do stage e a contagem.

**Agora, três camadas:**
1. **Faixa colorida fina** (2px) no topo da coluna na cor do stage. É a única cor "viva" na coluna — o resto fica neutro.
2. **Índice monoespaçado** `01`, `02`, `03`… à esquerda do nome do stage, em `font-mono text-text-tertiary text-caption`.
3. **Nome do stage** em `font-display font-semibold text-h5 text-text-primary`.
4. **Valor total da coluna** em `font-mono text-text-secondary` abaixo. Contagem ao lado em badge sutil (`bg-bg-hover text-text-secondary`).

> Por quê: deixa a hierarquia visual óbvia e o "pulso" do pipeline aparece nas faixas coloridas.

### 3. Card do lead

**Antes:** Card padrão com nome, valor, tags.

**Agora:**
- **Topo do card:** `ID monoespaçado` (`#L-2847`) em `font-mono text-text-tertiary` à esquerda + **label de temperatura** (`QUENTE` / `MORNO` / `FRIO`) à direita, badge minúscula `text-caption font-mono uppercase tracking-uppercase`. Cores:
  - `quente` → `bg-error/10 text-error border-error/20`
  - `morno` → `bg-warning/10 text-warning border-warning/20`
  - `frio` → `bg-bg-hover text-text-tertiary border-border-subtle`
- **Nome do contato** em `font-display font-semibold text-body-lg text-text-primary`.
- **Empresa / nicho** logo abaixo em `text-text-secondary text-body-sm`.
- **Valor** em `font-mono text-text-primary text-body` — destaque sem ser berrante.
- **Linha inferior** com tags + dias parado + ícones (telefone, email) em `text-text-tertiary text-caption`.
- **Atribuição** (avatar + nome) no canto inferior direito em `text-accent text-caption` quando atribuído (puxa o olhar pra responsabilidade).

> Por quê: o ID e a temperatura comunicam status num piscar, sem precisar abrir o card. O valor em mono fica fácil de comparar entre cards.

## O que NÃO muda

- Sidebar (vai num próximo handoff se quiser)
- Modal de novo contato
- Filtros (busca, tags, IA, responsável, nicho, dias)
- Toggle Lista/Kanban — a Lista fica como está; só o Kanban é redesenhado nesta etapa
- Drag & drop entre colunas
- Footer com totais (vai herdar o estilo automático ao usar tokens)

## Tipografia

Já está no projeto:
- `font-display` → Plus Jakarta Sans (títulos)
- `font-body` → Inter (corpo)
- `font-mono` → JetBrains Mono (IDs, valores, kickers, índices, timestamps)

Regra: **mono = números, IDs, metadados estruturados**. Nunca para parágrafos.

## Cores — uso correto dos tokens

| Onde | Token | Por quê |
|---|---|---|
| Fundo da página | `bg-bg-base` | Mais profundo, base |
| Coluna do Kanban | `bg-surface` | Eleva levemente do fundo |
| Card | `bg-elevated` | Eleva ainda mais sobre a coluna |
| Hover de card | `bg-bg-hover` | Discreto |
| Borda padrão | `border-border-subtle` | Sutil, padrão |
| Borda de card no hover | `border-border` | Um pouco mais visível |
| Texto primário | `text-text-primary` | Nomes, títulos |
| Texto secundário | `text-text-secondary` | Metadados |
| Texto terciário | `text-text-tertiary` | Labels, kickers, IDs |
| Ações primárias / acento | `bg-accent text-text-on-accent` | Botão Novo Contato, valor total no header |
| Sucesso (won) | `text-success` | Stage de fechamento |
| Erro (lost) | `text-error` | Stage de perda |

**Faixa colorida das colunas:** mantém a cor configurada pelo usuário no `pipeline_stages.color`
(blue, amber, cyan, purple, indigo, emerald, rose, pink, yellow, green, red).
A função `getStageHex()` no `page.tsx` atual já resolve isso — reaproveitar.
