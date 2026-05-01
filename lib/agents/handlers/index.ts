// lib/agents/handlers/index.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Auto-registro de todos os handlers conhecidos no kernel.
//
// Importar este arquivo (apenas uma vez, no início da execução) garante que
// `getHandler(capability)` consegue resolver handlers existentes — incluindo
// quando o kernel precisa "retomar" uma action pendente após aprovação humana.
//
// Pra adicionar handler novo:
//   1. Implementar arquivo em lib/agents/handlers/<capability>.ts
//   2. Importar e registrar abaixo
// ═══════════════════════════════════════════════════════════════════════════════

import { registerHandler } from '../handler-registry'
import { sendEmailHandler } from './send_email'

registerHandler('send_email', sendEmailHandler)

// Próximos handlers (a implementar):
//   - send_whatsapp        → migrar lib/sdr/whatsapp-sender
//   - generate_reply       → migrar lib/sdr/ai-agent
//   - capture_leads_serper → migrar lib/agents/hunter/runner
//   - move_pipeline_stage  → novo, escreve direto em leads
