// handoff/page.hybrid-reference.tsx
//
// REFERÊNCIA — não substituir o page.tsx atual por este arquivo.
// Use este arquivo como GUIA de como costurar PipelineHeader, PipelineColumn e
// PipelineCard dentro do `app/dashboard/crm/page.tsx` existente.
//
// Toda a lógica (estados, queries, drag & drop, paginação) deve ser preservada
// exatamente como está. Só o JSX do CABEÇALHO e do KANBAN é substituído.

'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
// ─── Imports adicionais (juntar aos existentes) ────────────────────────────────
import { PipelineHeader } from './components/PipelineHeader'
import { PipelineColumn } from './components/PipelineColumn'
import { PipelineCard } from './components/PipelineCard'
import { Plus, Upload, Maximize2, Minimize2 } from 'lucide-react'

// ─── Trecho 1: substituir o cabeçalho da página ────────────────────────────────
// Localizar o JSX que renderiza o título "Pipeline de Negócios" + subtítulo
// "Sincronizado em tempo real" + botões de ação (Novo Contato, Importar CSV,
// Fullscreen). Trocar TUDO esse bloco por:

/*
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
*/

// ─── Trecho 2: substituir a renderização das colunas do Kanban ────────────────
// Localizar o `pipelineStages.map((stage) => ...)` dentro do bloco do Kanban.
// Trocar pelo seguinte (mantendo handleDragOver, handleDrop, loadMoreForStage,
// ScrollSentinel — todos já existem no page.tsx atual):

/*
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
*/

// ─── Notas ─────────────────────────────────────────────────────────────────────
// 1. O modal de "Novo Contato" continua o mesmo — não é tocado nesta migração.
// 2. O ImportCsv (CsvImport.tsx) continua o mesmo — só o gatilho mudou de lugar
//    (agora é uma das secondaryActions do PipelineHeader).
// 3. O footer com totais pode permanecer; ao trocar cores hardcoded por tokens
//    (ver MIGRATION-PLAN passo 1), ele já fica coerente.
// 4. A view "Lista" (viewMode === 'list') NÃO foi migrada nesta etapa.
//    Mantida como está. Próximo handoff cobre a Lista.

export default function CrmPageHybridReference() {
  return null
}
