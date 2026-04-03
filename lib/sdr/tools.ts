// lib/sdr/tools.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Definição das tools do agente SDR Imobiliário
// Portado do workflow n8n validado (12 tools → adaptadas para multi-tenant)
//
// Cada tool tem:
//   - definition: schema para o Claude API (tool_use)
//   - execute: função que roda quando o Claude chama a tool
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Contexto passado para cada execução de tool ───
export interface ToolContext {
  org_id: string
  lead_id: string
  phone: string
  campaign_id: string | null
  instance_name: string
  agent_id: string
}

// ─── Resultado padronizado ───
export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINIÇÕES DAS TOOLS (schema para Claude API)
// ═══════════════════════════════════════════════════════════════════════════════

export const agentTools: Anthropic.Messages.Tool[] = [
  // 1. Think — raciocínio interno (não visível ao lead)
  {
    name: 'think',
    description: 'Use esta ferramenta para organizar seu raciocínio antes de responder. O conteúdo NÃO será enviado ao lead. Use para: analisar o estágio da conversa, decidir próximos passos, avaliar qualificação do lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        thought: {
          type: 'string',
          description: 'Seu raciocínio interno sobre a conversa e próximos passos'
        }
      },
      required: ['thought']
    }
  },

  // 2. Qualificar lead — atualizar estágio no CRM
  {
    name: 'qualify_lead',
    description: 'Atualiza o estágio do lead no CRM quando identificar avanço na qualificação. Estágios: new → qualifying → qualified → visit_scheduled → negotiation → won/lost.',
    input_schema: {
      type: 'object' as const,
      properties: {
        stage: {
          type: 'string',
          enum: ['new', 'qualifying', 'qualified', 'visit_scheduled', 'negotiation', 'won', 'lost'],
          description: 'Novo estágio do lead no funil'
        },
        reason: {
          type: 'string',
          description: 'Motivo da mudança de estágio (ex: "Lead confirmou interesse em apartamento 2 quartos na zona sul")'
        }
      },
      required: ['stage', 'reason']
    }
  },

  // 3. Agendar visita — criar evento na agenda do corretor
  {
    name: 'schedule_visit',
    description: 'Agenda uma visita ao imóvel na agenda do corretor. Use quando o lead confirmar interesse em visitar um imóvel e concordar com data/horário.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Data da visita no formato YYYY-MM-DD'
        },
        time: {
          type: 'string',
          description: 'Horário da visita no formato HH:MM'
        },
        property_description: {
          type: 'string',
          description: 'Descrição breve do imóvel a ser visitado'
        },
        address: {
          type: 'string',
          description: 'Endereço do imóvel (se disponível)'
        },
        notes: {
          type: 'string',
          description: 'Observações adicionais para o corretor'
        }
      },
      required: ['date', 'time', 'property_description']
    }
  },

  // 4. Buscar disponibilidade — verificar agenda do corretor
  {
    name: 'check_availability',
    description: 'Consulta a disponibilidade na agenda do corretor para os próximos dias. Use antes de sugerir horários de visita ao lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: {
          type: 'string',
          description: 'Data inicial para buscar disponibilidade (YYYY-MM-DD)'
        },
        date_to: {
          type: 'string',
          description: 'Data final para buscar disponibilidade (YYYY-MM-DD)'
        }
      },
      required: ['date_from']
    }
  },

  // 5. Avisar corretor — notificar via grupo WhatsApp ou direto
  {
    name: 'notify_agent',
    description: 'Envia notificação ao corretor responsável (via grupo WhatsApp ou direto). Use para: lead quente pronto para contato, visita agendada, lead pediu para falar com humano.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: 'Mensagem para o corretor'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Prioridade da notificação'
        },
        type: {
          type: 'string',
          enum: ['hot_lead', 'visit_scheduled', 'human_requested', 'info'],
          description: 'Tipo de notificação'
        }
      },
      required: ['message', 'priority', 'type']
    }
  },

  // 6. Atualizar nome do lead
  {
    name: 'update_lead_name',
    description: 'Atualiza o nome do lead no CRM quando ele se apresentar na conversa.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nome completo do lead'
        }
      },
      required: ['name']
    }
  },

  // 7. Finalizar conversa — marcar IA como pausada para este lead
  {
    name: 'end_conversation',
    description: 'Marca a conversa como finalizada. Use quando: lead não tem mais interesse, conversa atingiu objetivo, lead pediu para parar. Após isso a IA não responderá mais automaticamente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          enum: ['goal_achieved', 'no_interest', 'lead_requested', 'transferred_to_human', 'spam'],
          description: 'Motivo do encerramento'
        },
        summary: {
          type: 'string',
          description: 'Resumo breve da conversa para registro'
        }
      },
      required: ['reason', 'summary']
    }
  },

  // 8. Salvar informação do lead — dados coletados durante qualificação
  {
    name: 'save_lead_info',
    description: 'Salva informações coletadas do lead durante a conversa (tipo de imóvel, orçamento, região, urgência, etc). Estes dados ficam disponíveis para o corretor.',
    input_schema: {
      type: 'object' as const,
      properties: {
        field: {
          type: 'string',
          enum: ['budget', 'property_type', 'region', 'bedrooms', 'urgency', 'financing', 'current_situation', 'custom'],
          description: 'Campo a ser salvo'
        },
        value: {
          type: 'string',
          description: 'Valor coletado'
        },
        field_name: {
          type: 'string',
          description: 'Nome personalizado do campo (quando field=custom)'
        }
      },
      required: ['field', 'value']
    }
  }
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUÇÃO DAS TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeTool(
  toolName: string,
  input: any,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (toolName) {
    case 'think':
      return executeThink(input)

    case 'qualify_lead':
      return executeQualifyLead(input, ctx)

    case 'schedule_visit':
      return executeScheduleVisit(input, ctx)

    case 'check_availability':
      return executeCheckAvailability(input, ctx)

    case 'notify_agent':
      return executeNotifyAgent(input, ctx)

    case 'update_lead_name':
      return executeUpdateLeadName(input, ctx)

    case 'end_conversation':
      return executeEndConversation(input, ctx)

    case 'save_lead_info':
      return executeSaveLeadInfo(input, ctx)

    default:
      return { success: false, error: `Tool desconhecida: ${toolName}` }
  }
}

// ─── Think: apenas log, não faz nada no banco ───
async function executeThink(input: { thought: string }): Promise<ToolResult> {
  console.log(`[SDR:Think] ${input.thought.slice(0, 200)}`)
  return { success: true, data: { acknowledged: true } }
}

// ─── Qualify Lead: atualizar estágio no CRM ───
async function executeQualifyLead(
  input: { stage: string; reason: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const { error } = await supabase
    .from('leads')
    .update({
      stage: input.stage,
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  console.log(`[SDR:Qualify] Lead ${ctx.lead_id} → ${input.stage} | ${input.reason}`)
  return { success: true, data: { stage: input.stage, reason: input.reason } }
}

// ─── Schedule Visit: salvar evento + atualizar lead ───
async function executeScheduleVisit(
  input: { date: string; time: string; property_description: string; address?: string; notes?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // Salvar evento na tabela de visitas (ou calendar_events se existir)
  // Por enquanto, salva como metadata no lead e notifica
  const visitData = {
    date: input.date,
    time: input.time,
    property: input.property_description,
    address: input.address || '',
    notes: input.notes || '',
    scheduled_at: new Date().toISOString(),
    scheduled_by: 'sdr_agent'
  }

  // Atualizar lead com dados da visita e estágio
  const { error } = await supabase
    .from('leads')
    .update({
      stage: 'visit_scheduled',
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  // Salvar info da visita
  await saveMeta(ctx, 'visit_scheduled', visitData)

  console.log(`[SDR:Schedule] Visita agendada: ${input.date} ${input.time} | Lead ${ctx.lead_id}`)
  return {
    success: true,
    data: {
      message: `Visita agendada para ${input.date} às ${input.time}`,
      ...visitData
    }
  }
}

// ─── Check Availability: placeholder para integração com Google Calendar ───
async function executeCheckAvailability(
  input: { date_from: string; date_to?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // TODO: Integrar com Google Calendar API ou tabela de disponibilidade
  // Por enquanto, retorna disponibilidade simulada para não travar o fluxo
  const from = new Date(input.date_from)
  const slots = []

  for (let i = 0; i < 5; i++) {
    const date = new Date(from)
    date.setDate(date.getDate() + i)
    if (date.getDay() !== 0) { // excluir domingos
      slots.push({
        date: date.toISOString().split('T')[0],
        available_times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
      })
    }
  }

  return {
    success: true,
    data: {
      slots,
      note: 'Horários disponíveis nos próximos dias (confirme com o cliente)'
    }
  }
}

// ─── Notify Agent: salvar notificação (Parte 4 vai enviar via WhatsApp) ───
async function executeNotifyAgent(
  input: { message: string; priority: string; type: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // Salvar notificação para o corretor
  await saveMeta(ctx, 'agent_notification', {
    message: input.message,
    priority: input.priority,
    type: input.type,
    created_at: new Date().toISOString()
  })

  console.log(`[SDR:Notify] [${input.priority}] ${input.type}: ${input.message.slice(0, 100)}`)
  return { success: true, data: { notified: true, priority: input.priority } }
}

// ─── Update Lead Name ───
async function executeUpdateLeadName(
  input: { name: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const { error } = await supabase
    .from('leads')
    .update({ name: input.name, updated_at: new Date().toISOString() })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  console.log(`[SDR:Name] Lead ${ctx.lead_id} → "${input.name}"`)
  return { success: true, data: { name: input.name } }
}

// ─── End Conversation ───
async function executeEndConversation(
  input: { reason: string; summary: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const { error } = await supabase
    .from('leads')
    .update({
      conversa_finalizada: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  await saveMeta(ctx, 'conversation_ended', {
    reason: input.reason,
    summary: input.summary,
    ended_at: new Date().toISOString()
  })

  console.log(`[SDR:End] Lead ${ctx.lead_id} — ${input.reason}: ${input.summary.slice(0, 100)}`)
  return { success: true, data: { reason: input.reason } }
}

// ─── Save Lead Info ───
async function executeSaveLeadInfo(
  input: { field: string; value: string; field_name?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const fieldKey = input.field === 'custom' ? (input.field_name || 'custom') : input.field

  await saveMeta(ctx, `lead_info_${fieldKey}`, {
    field: fieldKey,
    value: input.value,
    collected_at: new Date().toISOString()
  })

  console.log(`[SDR:Info] Lead ${ctx.lead_id} | ${fieldKey}: ${input.value}`)
  return { success: true, data: { field: fieldKey, value: input.value } }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Salvar metadata do lead em sdr_messages (role: system)
// ═══════════════════════════════════════════════════════════════════════════════

async function saveMeta(ctx: ToolContext, action: string, data: any): Promise<void> {
  await supabase
    .from('sdr_messages')
    .insert({
      org_id: ctx.org_id,
      lead_id: ctx.lead_id,
      campaign_id: ctx.campaign_id,
      instance_name: ctx.instance_name,
      phone: ctx.phone,
      role: 'system',
      body: JSON.stringify({ action, ...data }),
      type: 'tool_result'
    })
}
