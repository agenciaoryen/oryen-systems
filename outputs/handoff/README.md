# Oryen — Handoff Pipeline Híbrido

Pacote de migração para aplicar o design **Pipeline Híbrido** (Refinada + Editorial)
no projeto `oryen-ai` mantendo intacta toda a lógica existente (Supabase, drag & drop,
filtros, paginação, modais).

## Conteúdo

| Arquivo | O que é | Para quê |
|---|---|---|
| `MIGRATION-PLAN.md` | Plano passo-a-passo, em ordem | Roteiro do Claude Code |
| `DESIGN-DECISIONS.md` | O que muda visualmente e por quê | Contexto do designer |
| `CLAUDE-CODE-PROMPT.md` | Prompt pronto pra colar no Claude Code | Execução |
| `components/PipelineHeader.tsx` | Cabeçalho novo (kicker + título com `/`) | Substitui header atual |
| `components/PipelineColumn.tsx` | Coluna do Kanban com faixa colorida e índice mono | Substitui coluna atual |
| `components/PipelineCard.tsx` | Card híbrido (ID mono + temperatura) | Substitui card atual |
| `page.hybrid-reference.tsx` | Referência de como o `page.tsx` deve ficar costurando os 3 componentes | Não substitui o page.tsx — é guia |

## Princípios desta migração

1. **Zero tokens novos.** Tudo usa o que já está em `outputs/design-tokens-v2.css` e
   exposto no `tailwind.config.ts` (`bg-surface`, `text-text-primary`, `border-border`,
   `text-accent` etc.). Se você ver uma cor inventada — é bug, abrir issue.
2. **Lógica intocada.** Estados, queries Supabase, RPC, drag & drop, paginação por
   stage, persistência de filtros na URL — nada disso muda. Só o JSX.
3. **Tema dark first, com light funcionando.** A camada de compatibilidade em
   `globals.css` (linhas 200+) já cobre as classes `bg-gray-*` que sobrarem; estamos
   migrando para classes semânticas (`bg-surface`) que respondem ao tema sozinhas.
4. **Acento Amber é assinatura.** Use `text-accent` / `bg-accent` em ações primárias
   (botão "Novo Contato", valor total, ID do card, atribuição). Não em tudo — é
   pontuação, não fundo.

## Ordem de execução sugerida

1. Ler `DESIGN-DECISIONS.md` (5 min)
2. Ler `MIGRATION-PLAN.md` (5 min)
3. Colar `CLAUDE-CODE-PROMPT.md` no Claude Code junto com este pacote
4. Validar visualmente em dark + light antes de fazer merge
