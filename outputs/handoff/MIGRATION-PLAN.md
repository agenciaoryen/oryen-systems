# Plano de migração — Pipeline Híbrido

Roteiro em ordem. Cada passo é independente; pode commitar entre eles.

## Pré-requisitos

- [ ] Branch nova: `git checkout -b design/pipeline-hybrid`
- [ ] Confirmar que `outputs/design-tokens-v2.css` está sendo importado (é, via `app/globals.css` linha 2 — OK).
- [ ] Confirmar fontes carregadas no `layout.tsx`: Plus Jakarta Sans, Inter, JetBrains Mono.
  Se faltar JetBrains Mono, adicionar via `next/font/google` e expor como `--font-jetbrains-mono`.

## Passo 1 — Limpar classes hardcoded no `app/dashboard/crm/page.tsx`

Antes de adicionar componentes novos, **substituir as classes Tailwind dark hardcoded
por classes semânticas dos tokens**. Isso prepara o terreno e já melhora o light mode.

Find & replace mecânico (somente em `app/dashboard/crm/page.tsx`):

| De | Para |
|---|---|
| `bg-gray-950` / `bg-gray-900/80` / `bg-[#0A0A0A]` (fundos de página) | `bg-bg-base` |
| `bg-gray-900` / `bg-gray-900/50` (containers/colunas) | `bg-surface` |
| `bg-gray-800` / `bg-[#1a1a1a]` (cards/elevados) | `bg-elevated` |
| `bg-gray-800/50` (hover) | `bg-bg-hover` |
| `border-gray-800` / `border-white/10` | `border-border-subtle` |
| `border-gray-700` | `border-border` |
| `text-white` (texto principal) | `text-text-primary` |
| `text-gray-400` | `text-text-secondary` |
| `text-gray-500` / `text-gray-600` | `text-text-tertiary` |
| `text-blue-400` (link/ação) | `text-primary` |
| `bg-blue-600` (botão primário) | `bg-primary text-text-on-primary` |
| `hover:bg-blue-700` | `hover:bg-primary-hover` |

> Não tocar em classes de tags coloridas (`text-amber-300`, `bg-emerald-500/10` etc.)
> que vêm do `STAGE_COLORS`/`TAG_COLORS` — essas mantêm porque dependem da cor do
> stage configurada pelo usuário.

## Passo 2 — Criar os 3 componentes novos

Copiar para o repo:

```
app/dashboard/crm/components/PipelineHeader.tsx
app/dashboard/crm/components/PipelineColumn.tsx
app/dashboard/crm/components/PipelineCard.tsx
```

Os arquivos estão em `handoff/components/`. São componentes de **apresentação puros**
— recebem props e renderizam. Nenhum acessa Supabase nem mantém estado de fetch.

## Passo 3 — Costurar no `page.tsx`

Editar `app/dashboard/crm/page.tsx`:

### 3.1 — Imports

```tsx
import { PipelineHeader } from './components/PipelineHeader'
import { PipelineColumn } from './components/PipelineColumn'
import { PipelineCard } from './components/PipelineCard'
```

### 3.2 — Substituir o cabeçalho atual

Procurar o JSX do cabeçalho da página (título "Pipeline de Negócios" + subtítulo +
botões "Novo Contato" / "Importar CSV" / fullscreen). Substituir o bloco inteiro por:

```tsx
<PipelineHeader
  index="03"
  kicker="DOSSIÊ"
  section="CRM"
  titleLeft="Pipeline"
  titleRight="Negócios"
  stats={[
    { value: totalPipelineCount, label: t.totalLeads },
    { value: formatPrice(totalPipelineValue, userCurrency), label: t.totalValue, highlight: true },
  ]}
  syncedLabel={t.synced}
  primaryAction={{ label: t.newLead, icon: Plus, onClick: () => setIsModalOpen(true) }}
  secondaryActions={[
    { label: t.importCsv, icon: Upload, onClick: () => setIsCsvImportOpen(true) },
    { label: isFullscreen ? t.exitFullscreen : t.fullscreen, icon: isFullscreen ? Minimize2 : Maximize2, onClick: toggleFullscreen },
  ]}
/>
```

> Os ícones (`Plus`, `Upload`, `Maximize2`, `Minimize2`) já estão importados de
> `lucide-react` no topo do arquivo.

### 3.3 — Substituir a renderização das colunas do Kanban

Procurar o bloco que faz `pipelineStages.map(stage => ...)` no Kanban. Substituir por:

```tsx
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
    {(stageLeads[stage.id] || []).map(lead => (
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
    {/* Mantém o ScrollSentinel existente */}
    <ScrollSentinel
      onVisible={() => loadMoreForStage(stage.id)}
      disabled={!stageHasMore[stage.id] || stageLoadingMore[stage.id]}
    />
  </PipelineColumn>
))}
```

> **Importante:** as funções `handleDragOver`, `handleDrop`, `loadMoreForStage`
> existem no arquivo atual — só reaproveitar. Não recriar.

## Passo 4 — Validar

1. **Dark mode (default):**
   - Header com kicker monoespaçado visível, título com `/` em peso fino
   - Faixas coloridas finas no topo de cada coluna
   - Cards com `#L-XXXX` no topo + label QUENTE/MORNO/FRIO
   - Botão "Novo Contato" em amber
2. **Light mode** (`<html data-theme="light">`):
   - Mesma estrutura, contrastes corretos
   - Amber escurecido (já vem do token `--color-accent` no light)
3. **Drag & drop entre colunas funciona**
4. **Infinite scroll por coluna funciona** (rolar até o fim de uma coluna carrega mais)
5. **Filtros (busca, tags, IA, responsável) funcionam**
6. **URL preserva filtros ao navegar para o detalhe e voltar**

## Passo 5 — Decidir o destino da Lista

A view "Lista" não está incluída nesta migração. Opções:
- **Manter como está** (recomendado por ora) — o Kanban é o foco do redesign.
- **Migrar depois** num handoff separado.

## Anti-checklist (NÃO FAZER)

- ❌ Não criar tokens novos no `design-tokens-v2.css`
- ❌ Não tocar em queries Supabase
- ❌ Não mudar a estrutura de paginação por stage (`stageLeads`, `stageCounts`, `stageSums`)
- ❌ Não remover a camada de compatibilidade light em `globals.css` — ela cobre os
  outros módulos (WhatsApp, financeiro etc.) que ainda usam classes hardcoded.
- ❌ Não usar `text-amber-400` / `bg-amber-500` direto — é `text-accent` / `bg-accent`.
