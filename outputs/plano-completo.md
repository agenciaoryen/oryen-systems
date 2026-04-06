# Plano Completo — Rebranding Oryen v2

**Data:** 2026-04-06
**Status:** Pronto para implementacao

---

## Entregas Produzidas

| Arquivo | Descricao | Status |
|---------|-----------|--------|
| `outputs/pesquisa-mercado.md` | Pesquisa de concorrencia, tendencias, analise da marca atual | Completo |
| `outputs/estrategia.md` | SWOT, posicionamento, personalidade, decisoes estrategicas | Completo |
| `outputs/branding-book-v2.md` | Branding book completo: cores, tipografia, componentes, aplicacoes | Completo |
| `outputs/design-tokens-v2.css` | Todos os tokens CSS prontos para implementacao | Completo |
| `outputs/tailwind-config-v2.ts` | Tailwind config atualizado com novos tokens | Completo |
| `outputs/logo-v2.svg` | Logo principal horizontal (dark) | Completo |
| `outputs/logo-v2-light.svg` | Logo horizontal (light) | Completo |
| `outputs/logo-v2-mono.svg` | Logo monocromatico branco | Completo |
| `outputs/logo-v2-icon.svg` | Icon isolado (favicon, app icon) | Completo |
| `outputs/logo-v2-icon-gradient.svg` | Icon com gradient (marketing) | Completo |

---

## Resumo das Mudancas Principais (v1 > v2)

### Identidade
- **Logo:** De "arcos arbitrarios" para "Orbital Intelligence" — anel orbital com terminal node
- **Gradient signature:** Cobalt > Indigo > Violet como impressao digital da marca
- **Cor indigo (#6E5FFF):** Nova cor que expande expressao para IA features e marketing

### Cores
- **Primary dark:** #4B6BFB > #4F6FFF (mais eletrico, melhor contraste)
- **Backgrounds:** 15% mais profundos (mais contraste, mais premium)
- **5 gradientes definidos:** brand, brand-subtle, accent, dark, glow

### Tipografia
- **Letter-spacing:** Mais apertado em headings (-0.03em display)
- **Weight 700:** Adicionado para impacto em landing pages
- **Tracking tokens:** Adicionados ao sistema para consistencia

### UI
- **Glass morphism:** Definido com tokens para header fixo, dropdowns
- **Shadow glow:** Nova sombra para CTAs hero
- **Utility classes:** .text-gradient-brand, .glass, .gradient-border, .glow-top, .focus-ring

---

## Plano de Implementacao

### Fase 1 — Tokens e Config (30 min)
1. Substituir `outputs/design-tokens.css` por `outputs/design-tokens-v2.css`
   - Ou: renomear v2 para design-tokens.css
   - O `globals.css` ja importa de `../outputs/design-tokens.css`
2. Atualizar `tailwind.config.ts` com conteudo de `outputs/tailwind-config-v2.ts`
3. Testar: app deve funcionar sem quebrar (tokens sao retrocompativeis)

### Fase 2 — Logos (15 min)
1. Substituir logos v1 pelos v2:
   - `logo.svg` < `logo-v2.svg`
   - `logo-light.svg` < `logo-v2-light.svg`
   - `logo-mono.svg` < `logo-v2-mono.svg`
   - `logo-icon.svg` < `logo-v2-icon.svg`
2. Adicionar `logo-icon-gradient.svg` (novo)
3. Atualizar favicon se necessario

### Fase 3 — Componentes UI (2-4 horas)
1. Aplicar gradient-brand em CTAs hero da landing page
2. Atualizar sidebar nav com novos estados (primary-subtle active)
3. Adicionar glass effect no header fixo
4. Aplicar .glow-top na hero section da landing
5. Revisar cards de KPI para usar novos shadows

### Fase 4 — Landing Page (4-6 horas)
1. Hero com gradient-glow background
2. Headlines com tracking-display e font-bold
3. CTA com gradient-brand button
4. Screenshot do produto com moldura premium
5. Feature section com icones primary + indigo

### Fase 5 — Social Media Templates (2 horas)
1. Template Instagram 1080x1080 seguindo guidelines do branding book
2. Template LinkedIn cover
3. Template story/reels com logo-v2-mono

---

## Validacao Final (checklist CMO)

- [ ] Tokens CSS carregam sem erro no dev server
- [ ] Todas as cores passam WCAG AA (verificar com axe-core)
- [ ] Logo renderiza corretamente em todos os SVGs
- [ ] Dark mode e light mode funcionam com toggle
- [ ] Gradient-brand aparece correto em Chrome, Firefox, Safari
- [ ] Glass effect funciona (backdrop-filter tem prefixo webkit)
- [ ] Landing page nao parece "template" — tem personalidade
- [ ] Dashboard mantem funcionalidade — rebranding nao quebrou UX
- [ ] Favicon atualizado
- [ ] Open Graph images atualizadas com nova identidade

---

## Proximo Passo

**Quem:** Letierre (fundador/dev)
**O que:** Implementar Fase 1 (tokens + config) e testar se tudo roda sem quebrar
**Quando:** Agora
**Por que:** E a mudanca de menor risco e maior impacto. Uma vez que os tokens estejam no lugar, todas as outras fases ficam mais simples.

Depois de validar Fase 1, seguir para Fase 2 (logos) e Fase 3 (componentes) em sequencia.
