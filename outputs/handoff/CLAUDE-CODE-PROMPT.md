# Prompt para o Claude Code

Cole tudo abaixo numa nova conversa do Claude Code, junto com a pasta `handoff/`
do projeto Oryen Design. Os caminhos abaixo são os reais do repo `oryen-ai`.

---

## Contexto

Você vai aplicar o design **Pipeline Híbrido** (Refinada + 3 elementos editoriais)
ao CRM do projeto **oryen-ai** (Next.js 16, React 19, Tailwind v4, Supabase).

**Toda a lógica do CRM deve permanecer exatamente como está.** Você só vai:
1. Substituir classes Tailwind dark hardcoded por classes semânticas dos tokens v2
   já existentes em `tailwind.config.ts`.
2. Criar 3 componentes novos de apresentação em `app/dashboard/crm/components/`.
3. Costurar esses 3 componentes dentro de `app/dashboard/crm/page.tsx`,
   substituindo APENAS o JSX do cabeçalho da página e do Kanban.

## Anti-checklist (regras duras)

- ❌ NÃO criar tokens novos no `outputs/design-tokens-v2.css`. Só usar os que já existem.
- ❌ NÃO tocar em queries Supabase, RPC, drag & drop, paginação, filtros ou modais.
- ❌ NÃO migrar a view "Lista" (`viewMode === 'list'`). Mantém como está.
- ❌ NÃO remover a camada de compatibilidade light em `app/globals.css` (linhas 200+).
  Ela ainda é usada por outros módulos (WhatsApp, financeiro etc.).
- ❌ NÃO usar `text-amber-400` / `bg-amber-500` direto. Use `text-accent` / `bg-accent`.
- ❌ NÃO mudar a estrutura `stageLeads` / `stageCounts` / `stageSums` / `stageHasMore`.
- ❌ NÃO converter classes hardcoded em arquivos fora de `app/dashboard/crm/page.tsx`.
  O escopo desta tarefa é só o CRM.

## Arquivos do handoff (anexados)

```
handoff/
├── README.md
├── DESIGN-DECISIONS.md          ← leia primeiro (5 min)
├── MIGRATION-PLAN.md            ← roteiro de execução
├── CLAUDE-CODE-PROMPT.md        ← este arquivo
├── page.hybrid-reference.tsx    ← guia de costura
└── components/
    ├── PipelineHeader.tsx
    ├── PipelineColumn.tsx
    └── PipelineCard.tsx
```

## Tarefa

### Passo 1 — Criar branch

```bash
git checkout -b design/pipeline-hybrid
```

### Passo 2 — Copiar os 3 componentes

Copie esses arquivos do handoff para o projeto, mantendo o conteúdo idêntico:

- `handoff/components/PipelineHeader.tsx` → `app/dashboard/crm/components/PipelineHeader.tsx`
- `handoff/components/PipelineColumn.tsx` → `app/dashboard/crm/components/PipelineColumn.tsx`
- `handoff/components/PipelineCard.tsx`   → `app/dashboard/crm/components/PipelineCard.tsx`

> Se a pasta `app/dashboard/crm/components/` não existir, crie. Se já existir
> (provável — `CustomSelect.tsx` está lá), só adicione os 3 arquivos novos.

### Passo 3 — Limpar classes hardcoded em `app/dashboard/crm/page.tsx`

Faça find & replace **somente neste arquivo**, substituindo classes Tailwind dark
hardcoded pelas classes semânticas dos tokens já configurados em `tailwind.config.ts`:

| De | Para |
|---|---|
| `bg-gray-950`, `bg-gray-900/80`, `bg-[#0A0A0A]` (fundos de página) | `bg-bg-base` |
| `bg-gray-900`, `bg-gray-900/50` (containers de coluna) | `bg-surface` |
| `bg-gray-800`, `bg-[#1a1a1a]` (cards/elevados) | `bg-elevated` |
| `bg-gray-800/50` (hover) | `bg-bg-hover` |
| `border-gray-800`, `border-white/10` | `border-border-subtle` |
| `border-gray-700` | `border-border` |
| `text-white` (texto principal de UI, não dentro de bg colorido) | `text-text-primary` |
| `text-gray-400` | `text-text-secondary` |
| `text-gray-500`, `text-gray-600` | `text-text-tertiary` |
| `text-blue-400` (link/ação) | `text-primary` |
| `bg-blue-600` (botão primário antigo) | `bg-primary text-text-on-primary` |
| `hover:bg-blue-700` | `hover:bg-primary-hover` |

**Não tocar** em:
- Classes coloridas usadas dentro de `STAGE_COLORS` e `TAG_COLORS` (vêm da
  configuração do usuário).
- O bloco do `viewMode === 'list'` (não é alvo deste handoff).

### Passo 4 — Substituir o cabeçalho da página

Em `app/dashboard/crm/page.tsx`, localize o JSX do header da página (título
"Pipeline de Negócios", subtítulo "Sincronizado em tempo real" e botões "Novo Contato"
/ "Importar CSV" / fullscreen). Substitua o bloco inteiro por:

```tsx
<PipelineHeader
  index="03"
  kicker="DOSSIÊ"
  section="CRM"
  titleLeft="Pipeline"
  titleRight="Negócios"
  syncedLabel={t.synced}
  stats={[
    { value: totalPipelineCount, label: t.totalLeads },
    {
      value: formatPrice(totalPipelineValue, userCurrency),
      label: t.totalValue,
      highlight: true,
    },
  ]}
  primaryAction={{
    label: t.newLead,
    icon: Plus,
    onClick: () => setIsModalOpen(true),
  }}
  secondaryActions={[
    { label: t.importCsv, icon: Upload, onClick: () => setIsCsvImportOpen(true) },
    {
      label: isFullscreen ? t.exitFullscreen : t.fullscreen,
      icon: isFullscreen ? Minimize2 : Maximize2,
      onClick: toggleFullscreen,
    },
  ]}
/>
```

Se o nome do estado for diferente (ex.: `setShowImportCsv` em vez de `setIsCsvImportOpen`),
use o nome real existente — não invente.

Adicione o import no topo do arquivo:

```tsx
import { PipelineHeader } from './components/PipelineHeader'
```

### Passo 5 — Substituir o Kanban

Localize o trecho que renderiza as colunas do Kanban (`pipelineStages.map(...)`).
Substitua APENAS a renderização das colunas + cards (não a paginação, drag & drop,
ScrollSentinel) por:

```tsx
<div className="flex gap-4 px-6 pb-6 overflow-x-auto">
  {pipelineStages.map((stage, index) => (
    <PipelineColumn
      key={stage.id}
      index={String(index + 1).padStart(2, '0')}
      label={stage.label}
      color={stage.color}
      count={stageCounts[stage.id] || 0}
      sumLabel={formatPrice(stageSums[stage.id] || 0, userCurrency)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, stage.id)}
    >
      {(stageLeads[stage.id] || []).map((lead) => (
        <PipelineCard
          key={lead.id}
          lead={lead}
          leadTags={leadTags}
          tags={tags}
          cardFields={cardFields}
          cardShowStale={cardShowStale}
          cardShowAiStatus={cardShowAiStatus}
          userLang={userLang}
          userCurrency={userCurrency}
          userTimezone={userTimezone}
          onClick={() => router.push(`/dashboard/crm/${lead.id}`)}
          onDragStart={() => setDraggedLeadId(lead.id)}
          onDragEnd={() => setDraggedLeadId(null)}
          isDragging={draggedLeadId === lead.id}
          translations={t}
        />
      ))}
      <ScrollSentinel
        onVisible={() => loadMoreForStage(stage.id)}
        disabled={!stageHasMore[stage.id] || stageLoadingMore[stage.id]}
      />
    </PipelineColumn>
  ))}
</div>
```

Adicione os imports:

```tsx
import { PipelineColumn } from './components/PipelineColumn'
import { PipelineCard } from './components/PipelineCard'
```

> Se algum nome de função (`handleDragOver`, `handleDrop`, `loadMoreForStage`)
> não existir exatamente como acima no `page.tsx` atual, use o nome real
> definido no arquivo. Não renomeie nada.

### Passo 6 — Validar

```bash
pnpm dev   # ou npm run dev
```

Abra `/dashboard/crm` e verifique:

1. **Dark mode (default):**
   - Kicker monoespaçado `03 · DOSSIÊ · CRM` no topo
   - Título com barra `/` separando "Pipeline" de "Negócios"
   - Stats à direita do título (total e valor em amber)
   - Faixas coloridas finas no topo de cada coluna do Kanban
   - Índice mono `01`, `02`… em cada coluna
   - Cards com `#L-XXXX` no topo + label QUENTE/MORNO/FRIO à direita
   - Valor em fonte mono dentro do card
   - Botão "Novo Contato" em amber
2. **Light mode** (alternar tema na sidebar):
   - Mesma estrutura, contrastes legíveis, amber escurecido
3. **Funcionalidade:**
   - Drag & drop entre colunas funciona
   - Infinite scroll por coluna funciona
   - Filtros (busca, tags, IA, responsável, nicho) funcionam
   - Modal "Novo Contato" abre normalmente
   - Voltar do detalhe (`/dashboard/crm/[id]`) preserva filtros via URL

### Passo 7 — Commit

```bash
git add .
git commit -m "feat(crm): pipeline hibrido — header editorial, colunas com indice, cards com ID + temperatura"
```

## Quando reportar de volta

- ✅ Se tudo funcionou: commit pronto, screenshots dark + light.
- ⚠️ Se os nomes de estado/função no `page.tsx` divergirem do que está no prompt:
  reporte os nomes reais e o que você usou no lugar.
- 🚫 Se algo da lógica quebrar (drag & drop, paginação, filtros): reverta o
  commit e abra issue. NÃO tente "consertar" mudando a lógica — é problema da
  costura visual.

## Fontes

`Plus Jakarta Sans` (display), `Inter` (body), `JetBrains Mono` (mono).
Todas devem estar carregadas via `next/font/google` no `layout.tsx` e expostas como
CSS variables (`--font-plus-jakarta`, `--font-inter`, `--font-jetbrains-mono`),
porque os tokens v2 leem elas dali. Se `JetBrains Mono` não estiver carregada,
adicionar — caso contrário os kickers e IDs vão cair em monospace de sistema.
