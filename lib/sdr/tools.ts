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
    description: 'Agenda uma visita ao imóvel na agenda do corretor. Use quando o lead confirmar interesse em visitar um imóvel e concordar com data/horário. NÃO use se já agendou uma visita para este lead — o sistema retornará que já existe agendamento.',
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

  // 8. Buscar informações do lead — dados já coletados, histórico, notas
  {
    name: 'buscar_info_lead',
    description: 'Consulta informações já coletadas sobre o lead: dados do CRM (nome, estágio, origem, cidade, interesse, tipo de contato) e informações salvas em conversas anteriores (orçamento, tipo de imóvel, região, etc). Use SEMPRE no início da conversa para ter contexto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_saved_info: {
          type: 'boolean',
          description: 'Se true, inclui informações salvas via save_lead_info (orçamento, tipo, etc)'
        }
      },
      required: []
    }
  },

  // 9. Salvar informação do lead — dados coletados durante qualificação
  {
    name: 'reschedule_visit',
    description: 'Reagenda uma visita ou compromisso existente para nova data/horário. Use quando o lead pedir para mudar a data ou horário de uma visita já agendada.',
    input_schema: {
      type: 'object' as const,
      properties: {
        new_date: {
          type: 'string',
          description: 'Nova data no formato YYYY-MM-DD'
        },
        new_time: {
          type: 'string',
          description: 'Novo horário no formato HH:MM'
        },
        reason: {
          type: 'string',
          description: 'Motivo do reagendamento (opcional)'
        }
      },
      required: ['new_date', 'new_time']
    }
  },

  {
    name: 'cancel_event',
    description: 'Cancela uma visita ou compromisso agendado. Use quando o lead desistir da visita ou pedir para cancelar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo do cancelamento'
        }
      },
      required: ['reason']
    }
  },

  // 12. Buscar imóveis no portfólio da imobiliária
  {
    name: 'search_properties',
    description: 'Busca imóveis disponíveis no portfólio da imobiliária. Use para encontrar imóveis que combinem com o que o lead procura (tipo, região, quartos, faixa de preço). Retorna até 5 resultados com detalhes completos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        property_type: {
          type: 'string',
          enum: ['apartment', 'house', 'commercial', 'land', 'rural', 'other'],
          description: 'Tipo de imóvel (opcional)'
        },
        transaction_type: {
          type: 'string',
          enum: ['sale', 'rent', 'sale_or_rent'],
          description: 'Tipo de transação (opcional)'
        },
        min_price: {
          type: 'number',
          description: 'Preço mínimo (opcional)'
        },
        max_price: {
          type: 'number',
          description: 'Preço máximo (opcional)'
        },
        min_bedrooms: {
          type: 'number',
          description: 'Número mínimo de quartos (opcional)'
        },
        neighborhood: {
          type: 'string',
          description: 'Bairro ou região de interesse (opcional)'
        }
      },
      required: []
    }
  },

  // 13. Buscar imóvel por código de referência
  {
    name: 'get_property_by_ref',
    description: 'Busca um imóvel específico pelo código de referência (ex: REF-1001), slug, ou ID. Use quando o lead mencionar um código de imóvel na conversa ou quando a primeira mensagem contiver uma referência a um imóvel específico.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reference: {
          type: 'string',
          description: 'Código de referência, slug ou ID do imóvel (ex: REF-1001, apartamento-3-quartos-centro, ou UUID)'
        }
      },
      required: ['reference']
    }
  },

  {
    name: 'save_lead_info',
    description: 'Salva informações coletadas do lead durante a conversa (tipo de imóvel, orçamento, região, urgência, etc). Estes dados ficam disponíveis para o corretor.',
    input_schema: {
      type: 'object' as const,
      properties: {
        field: {
          type: 'string',
          enum: ['budget', 'property_type', 'region', 'bedrooms', 'urgency', 'financing', 'current_situation', 'interest', 'contact_type', 'lead_city', 'custom'],
          description: 'Campo a ser salvo. "interest": tipo de transação (compra, locação). "contact_type": perfil do lead (comprador, vendedor, locatário). "lead_city": cidade onde o lead MORA. "region": região/bairro onde quer BUSCAR imóvel (NÃO é onde mora).'
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
  },

  // 15. Enviar fotos de propriedade ao lead
  {
    name: 'send_property_images',
    description: 'Envia fotos de uma propriedade ao lead via WhatsApp. Use quando o lead pedir fotos ou quando quiser apresentar visualmente um imóvel. Envia até 4 fotos de uma vez.',
    input_schema: {
      type: 'object' as const,
      properties: {
        property_id: {
          type: 'string',
          description: 'ID da propriedade (retornado por search_properties ou get_property_by_ref)'
        },
        max_images: {
          type: 'number',
          description: 'Máximo de fotos a enviar (1-4, padrão 3)'
        }
      },
      required: ['property_id']
    }
  }
]

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSET DE TOOLS PARA O RESPONDER (pipeline multi-agente)
// ═══════════════════════════════════════════════════════════════════════════════
// O responder NÃO precisa de:
// - buscar_info_lead (pré-carregado pelo intake)
// - save_lead_info (pós-processado pelo executor via enricher)
// - update_lead_name (pós-processado pelo executor via enricher)
// - qualify_lead (pós-processado pelo executor via enricher, exceto via schedule_visit)
//
// Isso elimina 2-3 loops de tool_use, reduzindo ~60-70% do consumo de tokens.

const RESPONDER_EXCLUDED_TOOLS = [
  'buscar_info_lead',
  'save_lead_info',
  'update_lead_name',
  'qualify_lead',
]

export const responderTools: Anthropic.Messages.Tool[] = agentTools.filter(
  tool => !RESPONDER_EXCLUDED_TOOLS.includes(tool.name)
)

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

    case 'buscar_info_lead':
      return executeBuscarInfoLead(input, ctx)

    case 'reschedule_visit':
      return executeRescheduleVisit(input, ctx)

    case 'cancel_event':
      return executeCancelEvent(input, ctx)

    case 'save_lead_info':
      return executeSaveLeadInfo(input, ctx)

    case 'search_properties':
      return executeSearchProperties(input, ctx)

    case 'get_property_by_ref':
      return executeGetPropertyByRef(input, ctx)

    case 'send_property_images':
      return executeSendPropertyImages(input, ctx)

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
  // Buscar stages do pipeline ativo da org para mapear corretamente
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('name, label, position')
    .eq('org_id', ctx.org_id)
    .eq('is_active', true)
    .order('position')

  // Mapear stage do agente para stage real do pipeline
  let targetStage = input.stage
  if (stages && stages.length > 0) {
    // Tentar match direto
    const directMatch = stages.find(s => s.name === input.stage)
    if (!directMatch) {
      // Mapear stages semânticos do agente para stages do pipeline
      const stageMap: Record<string, string[]> = {
        'new':              ['new', 'novo', 'captado', 'lead'],
        'qualifying':       ['qualifying', 'qualificacao', 'contatado', 'contacted'],
        'qualified':        ['qualified', 'qualificado', 'lead_respondeu', 'responded'],
        'visit_scheduled':  ['visit_scheduled', 'visita_agendada', 'agendado', 'scheduled'],
        'negotiation':      ['negotiation', 'negociacao', 'proposta_enviada', 'proposal'],
        'won':              ['won', 'fechamento', 'ganho', 'closed_won'],
        'lost':             ['lost', 'perdido', 'closed_lost'],
      }
      const aliases = stageMap[input.stage] || [input.stage]
      const mapped = stages.find(s => aliases.some(a =>
        s.name.toLowerCase().includes(a) || s.label.toLowerCase().includes(a)
      ))
      if (mapped) {
        targetStage = mapped.name
      } else {
        // Fallback: usar posição relativa
        const positionMap: Record<string, number> = {
          'new': 0, 'qualifying': 1, 'qualified': 2,
          'visit_scheduled': 3, 'negotiation': 4, 'won': 5, 'lost': 6
        }
        const pos = positionMap[input.stage]
        if (pos !== undefined && pos < stages.length) {
          targetStage = stages[Math.min(pos, stages.length - 1)].name
        }
      }
    }
  }

  // Buscar stage anterior para o evento
  const { data: currentLead } = await supabase
    .from('leads')
    .select('stage')
    .eq('id', ctx.lead_id)
    .single()

  const previousStage = currentLead?.stage || 'new'

  // Proteger contra retrocesso de stage (ex: visit_scheduled → qualified)
  const STAGE_ORDER: Record<string, number> = {
    'new': 0, 'qualifying': 1, 'qualified': 2,
    'visit_scheduled': 3, 'visita_agendada': 3, 'agendado': 3,
    'negotiation': 4, 'negociacao': 4,
    'won': 5, 'fechamento': 5, 'lost': 5, 'perdido': 5,
  }
  const currentOrder = STAGE_ORDER[previousStage.toLowerCase()] ?? -1
  const targetOrder = STAGE_ORDER[targetStage.toLowerCase()] ?? -1

  if (targetOrder >= 0 && currentOrder >= 0 && targetOrder < currentOrder) {
    console.log(`[SDR:Qualify] Bloqueado retrocesso: ${previousStage} (${currentOrder}) → ${targetStage} (${targetOrder})`)
    return {
      success: true,
      data: {
        stage: previousStage,
        original_stage: input.stage,
        reason: `Stage não alterado: lead já está em ${previousStage} (mais avançado que ${targetStage})`,
        blocked: true
      }
    }
  }

  const { error } = await supabase
    .from('leads')
    .update({
      stage: targetStage,
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  // Registrar na linha do tempo
  await supabase.from('lead_events').insert({
    lead_id: ctx.lead_id,
    type: 'stage_change',
    content: `Agente IA alterou etapa de ${previousStage} para ${targetStage}. Motivo: ${input.reason}`
  }).then(() => {}).catch(() => {})

  console.log(`[SDR:Qualify] Lead ${ctx.lead_id} → ${targetStage} (solicitado: ${input.stage}) | ${input.reason}`)
  return { success: true, data: { stage: targetStage, original_stage: input.stage, reason: input.reason } }
}

// ─── Schedule Visit: salvar evento + atualizar lead + alertar corretor ───
async function executeScheduleVisit(
  input: { date: string; time: string; property_description: string; address?: string; notes?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // Verificar se já existe visita agendada para este lead (evitar duplicação)
  const { data: existingVisits } = await supabase
    .from('calendar_events')
    .select('id, event_date, start_time, status')
    .eq('lead_id', ctx.lead_id)
    .eq('org_id', ctx.org_id)
    .eq('event_type', 'visit')
    .eq('status', 'scheduled')

  if (existingVisits && existingVisits.length > 0) {
    const existing = existingVisits[0]
    console.log(`[SDR:Schedule] Visita já existe para lead ${ctx.lead_id}: ${existing.event_date} ${existing.start_time} — ignorando duplicação`)
    return {
      success: true,
      data: {
        message: `Já existe uma visita agendada para ${existing.event_date} às ${existing.start_time}. Não é necessário agendar novamente.`,
        already_scheduled: true,
        existing_date: existing.event_date,
        existing_time: existing.start_time
      }
    }
  }

  const visitData = {
    date: input.date,
    time: input.time,
    property: input.property_description,
    address: input.address || '',
    notes: input.notes || '',
    scheduled_at: new Date().toISOString(),
    scheduled_by: 'sdr_agent'
  }

  // Mapear stage semanticamente para o pipeline da org
  let visitStage = 'visit_scheduled'
  const { data: pipelineStages } = await supabase
    .from('pipeline_stages')
    .select('name, label, position')
    .eq('org_id', ctx.org_id)
    .eq('is_active', true)
    .order('position')

  if (pipelineStages && pipelineStages.length > 0) {
    const visitAliases = ['visit_scheduled', 'visita_agendada', 'agendado', 'scheduled', 'visita']
    const mapped = pipelineStages.find(s =>
      visitAliases.some(a =>
        s.name.toLowerCase().includes(a) || s.label.toLowerCase().includes(a)
      )
    )
    if (mapped) {
      visitStage = mapped.name
    } else {
      // Fallback: usar posição 3 (tipicamente visit_scheduled) se existir
      if (pipelineStages.length > 3) {
        visitStage = pipelineStages[3].name
      }
    }
  }

  // Atualizar lead com estágio mapeado
  const { error } = await supabase
    .from('leads')
    .update({
      stage: visitStage,
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  // Salvar info da visita
  await saveMeta(ctx, 'visit_scheduled', visitData)

  // Criar evento real no calendário
  const [h, m] = input.time.split(':').map(Number)
  const endH = Math.min(h + 1, 23)
  const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  await supabase.from('calendar_events').insert({
    org_id: ctx.org_id,
    lead_id: ctx.lead_id,
    title: `Visita: ${input.property_description}`,
    description: input.notes || null,
    event_type: 'visit',
    event_date: input.date,
    start_time: input.time,
    end_time: endTime,
    address: input.address || null,
    status: 'scheduled',
    created_by: 'sdr_agent',
    notes: input.notes || null
  })

  // Buscar nome do lead para o alerta
  const { data: lead } = await supabase
    .from('leads')
    .select('name, phone')
    .eq('id', ctx.lead_id)
    .single()

  // Criar alerta para o corretor (owner da org)
  const { data: owner } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', ctx.org_id)
    .eq('role', 'owner')
    .limit(1)
    .single()

  if (owner) {
    await supabase.from('alerts').insert({
      user_id: owner.id,
      type: 'urgent',
      title: `Visita agendada: ${input.date} às ${input.time}`,
      description: `Lead: ${lead?.name || 'N/A'} (${lead?.phone || ctx.phone})\nImóvel: ${input.property_description}\n${input.address ? 'Endereço: ' + input.address + '\n' : ''}${input.notes ? 'Obs: ' + input.notes : ''}`,
      action_link: `/dashboard/crm/${ctx.lead_id}`,
      action_label: 'Ver lead',
      is_read: false
    })
  }

  // Registrar na linha do tempo
  await supabase.from('lead_events').insert({
    lead_id: ctx.lead_id,
    type: 'visit_scheduled',
    content: `Agente IA agendou visita: ${input.date} às ${input.time} — ${input.property_description}${input.address ? ' | ' + input.address : ''}`
  }).then(() => {}).catch(() => {})

  console.log(`[SDR:Schedule] Visita agendada: ${input.date} ${input.time} | Lead ${ctx.lead_id} | alerta: ${!!owner}`)
  return {
    success: true,
    data: {
      message: `Visita agendada para ${input.date} às ${input.time}. O corretor receberá uma notificação.`,
      ...visitData,
      alert_created: !!owner
    }
  }
}

// ─── Check Availability: consulta real na tabela calendar_events ───
async function executeCheckAvailability(
  input: { date_from: string; date_to?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const dateTo = input.date_to || input.date_from

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('event_date, start_time, end_time, title, event_type')
    .eq('org_id', ctx.org_id)
    .eq('status', 'scheduled')
    .gte('event_date', input.date_from)
    .lte('event_date', dateTo)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) return { success: false, error: error.message }

  const busySlots = (events || []).map(e => ({
    date: e.event_date,
    from: e.start_time,
    to: e.end_time || '(sem fim definido)',
    what: e.title
  }))

  return {
    success: true,
    data: {
      calendar_integrated: true,
      busy_slots: busySlots,
      total_events: busySlots.length,
      suggested_hours: 'Horário comercial: seg-sex 9h às 18h | sáb 9h às 12h',
      instruction: busySlots.length === 0
        ? `Não há compromissos agendados entre ${input.date_from} e ${dateTo}. Pode sugerir horários em horário comercial.`
        : `Há ${busySlots.length} compromisso(s) no período. Evite os horários ocupados ao sugerir ao lead.`
    }
  }
}

// ─── Reschedule Visit: reagendar evento existente ───
async function executeRescheduleVisit(
  input: { new_date: string; new_time: string; reason?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // Buscar evento agendado mais recente do lead
  const { data: event, error: findErr } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, start_time')
    .eq('org_id', ctx.org_id)
    .eq('lead_id', ctx.lead_id)
    .eq('status', 'scheduled')
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  if (findErr || !event) {
    return { success: false, error: 'Nenhum evento agendado encontrado para este lead.' }
  }

  // Calcular end_time (1h depois)
  const [h, m] = input.new_time.split(':').map(Number)
  const endH = Math.min(h + 1, 23)
  const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  // Atualizar evento
  const { error: updateErr } = await supabase
    .from('calendar_events')
    .update({
      event_date: input.new_date,
      start_time: input.new_time,
      end_time: endTime,
      notes: input.reason ? `Reagendado: ${input.reason}` : 'Reagendado pelo lead',
      updated_at: new Date().toISOString()
    })
    .eq('id', event.id)

  if (updateErr) return { success: false, error: updateErr.message }

  // Criar alerta para o corretor
  const { data: owner } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', ctx.org_id)
    .eq('role', 'owner')
    .limit(1)
    .single()

  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('id', ctx.lead_id)
    .single()

  if (owner) {
    await supabase.from('alerts').insert({
      user_id: owner.id,
      type: 'urgent',
      title: `Visita reagendada: ${input.new_date} às ${input.new_time}`,
      description: `Lead: ${lead?.name || ctx.phone}\nAnterior: ${event.event_date} às ${event.start_time}\n${input.reason ? 'Motivo: ' + input.reason : ''}`,
      action_link: `/dashboard/crm/${ctx.lead_id}`,
      action_label: 'Ver lead',
      is_read: false
    })
  }

  await supabase.from('lead_events').insert({
    lead_id: ctx.lead_id,
    type: 'visit_rescheduled',
    content: `Visita reagendada: ${event.event_date} ${event.start_time} → ${input.new_date} ${input.new_time}${input.reason ? ' | Motivo: ' + input.reason : ''}`
  }).then(() => {}).catch(() => {})

  console.log(`[SDR:Reschedule] ${event.event_date} ${event.start_time} → ${input.new_date} ${input.new_time} | Lead ${ctx.lead_id}`)
  return {
    success: true,
    data: {
      message: `Visita reagendada de ${event.event_date} para ${input.new_date} às ${input.new_time}. O corretor foi notificado.`,
      previous_date: event.event_date,
      previous_time: event.start_time,
      new_date: input.new_date,
      new_time: input.new_time
    }
  }
}

// ─── Cancel Event: cancelar evento agendado ───
async function executeCancelEvent(
  input: { reason: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // Buscar evento agendado mais recente do lead
  const { data: event, error: findErr } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, start_time')
    .eq('org_id', ctx.org_id)
    .eq('lead_id', ctx.lead_id)
    .eq('status', 'scheduled')
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  if (findErr || !event) {
    return { success: false, error: 'Nenhum evento agendado encontrado para este lead.' }
  }

  // Cancelar evento
  const { error: updateErr } = await supabase
    .from('calendar_events')
    .update({
      status: 'cancelled',
      notes: `Cancelado pelo lead: ${input.reason}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', event.id)

  if (updateErr) return { success: false, error: updateErr.message }

  // Criar alerta para o corretor
  const { data: owner } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', ctx.org_id)
    .eq('role', 'owner')
    .limit(1)
    .single()

  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('id', ctx.lead_id)
    .single()

  if (owner) {
    await supabase.from('alerts').insert({
      user_id: owner.id,
      type: 'urgent',
      title: `Visita cancelada: ${event.event_date} às ${event.start_time}`,
      description: `Lead: ${lead?.name || ctx.phone}\nMotivo: ${input.reason}`,
      action_link: `/dashboard/crm/${ctx.lead_id}`,
      action_label: 'Ver lead',
      is_read: false
    })
  }

  await supabase.from('lead_events').insert({
    lead_id: ctx.lead_id,
    type: 'visit_cancelled',
    content: `Visita cancelada: ${event.event_date} ${event.start_time} | Motivo: ${input.reason}`
  }).then(() => {}).catch(() => {})

  console.log(`[SDR:Cancel] Evento cancelado: ${event.event_date} ${event.start_time} | Lead ${ctx.lead_id} | Motivo: ${input.reason}`)
  return {
    success: true,
    data: {
      message: `Visita de ${event.event_date} às ${event.start_time} foi cancelada. O corretor foi notificado.`,
      cancelled_date: event.event_date,
      cancelled_time: event.start_time,
      reason: input.reason
    }
  }
}

// ─── Notify Agent: criar alerta real no dashboard + salvar metadata ───
async function executeNotifyAgent(
  input: { message: string; priority: string; type: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // 1. Buscar owner da org para criar alerta visível no dashboard
  const { data: owner } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', ctx.org_id)
    .eq('role', 'owner')
    .limit(1)
    .single()

  // Mapear tipo para tipo de alerta do dashboard
  const alertType = input.priority === 'urgent' ? 'urgent' : input.type === 'info' ? 'info' : 'suggestion'

  const titleMap: Record<string, string> = {
    hot_lead: 'Lead quente pronto para contato',
    visit_scheduled: 'Visita agendada',
    human_requested: 'Lead pediu para falar com humano',
    info: 'Informação do agente SDR'
  }

  if (owner) {
    await supabase.from('alerts').insert({
      user_id: owner.id,
      type: alertType,
      title: titleMap[input.type] || 'Notificação do agente SDR',
      description: input.message,
      action_link: `/dashboard/crm/${ctx.lead_id}`,
      action_label: 'Ver lead',
      is_read: false
    })
  }

  // 2. Salvar metadata no histórico
  await saveMeta(ctx, 'agent_notification', {
    message: input.message,
    priority: input.priority,
    type: input.type,
    alert_created: !!owner,
    created_at: new Date().toISOString()
  })

  console.log(`[SDR:Notify] [${input.priority}] ${input.type}: ${input.message.slice(0, 100)} | alert: ${!!owner}`)
  return { success: true, data: { notified: true, priority: input.priority, alert_created: !!owner } }
}

// ─── Buscar Info Lead: dados do CRM + metadata salva ───
async function executeBuscarInfoLead(
  input: { include_saved_info?: boolean },
  ctx: ToolContext
): Promise<ToolResult> {
  // 1. Dados do CRM
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, phone, email, stage, source, city, nicho, tipo_contato, interesse, instagram, url_site, total_em_vendas, created_at, updated_at, conversa_finalizada')
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)
    .single()

  // 2. Informações salvas via save_lead_info (metadata em sdr_messages role=system)
  let savedInfo: Record<string, any>[] = []
  if (input.include_saved_info !== false) {
    const { data: metaMessages } = await supabase
      .from('sdr_messages')
      .select('body, created_at')
      .eq('lead_id', ctx.lead_id)
      .eq('org_id', ctx.org_id)
      .eq('role', 'system')
      .eq('type', 'tool_result')
      .order('created_at', { ascending: false })
      .limit(30)

    if (metaMessages) {
      savedInfo = metaMessages
        .map(m => { try { return JSON.parse(m.body) } catch { return null } })
        .filter(m => m && (m.action?.startsWith('lead_info_') || m.action === 'conversation_ended' || m.action === 'visit_scheduled' || m.action === 'agent_notification'))
    }
  }

  // 3. Notas do timeline (lead_events)
  const { data: notes } = await supabase
    .from('lead_events')
    .select('type, content, created_at')
    .eq('lead_id', ctx.lead_id)
    .eq('type', 'note')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log(`[SDR:BuscarInfo] Lead ${ctx.lead_id} | CRM: ${!!lead} | saved_info: ${savedInfo.length} | notes: ${notes?.length || 0}`)

  return {
    success: true,
    data: {
      crm: lead || {},
      saved_info: savedInfo,
      notes: notes || [],
      tip: 'Use estas informações para dar continuidade à conversa sem repetir perguntas já respondidas.'
    }
  }
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

  // Enfileirar para follow-up automático (se não existe já)
  try {
    // Verificar se já existe um follow-up ativo para este lead
    const { data: existing } = await supabase
      .from('follow_up_queue')
      .select('id')
      .eq('lead_id', ctx.lead_id)
      .eq('org_id', ctx.org_id)
      .in('status', ['pending', 'active'])
      .limit(1)

    if (!existing || existing.length === 0) {
      // Buscar stage atual do lead
      const { data: lead } = await supabase
        .from('leads')
        .select('stage')
        .eq('id', ctx.lead_id)
        .single()

      const now = new Date()
      // Primeira tentativa: 4 horas após o fim da conversa
      const firstAttempt = new Date(now.getTime() + 4 * 60 * 60 * 1000)

      await supabase.from('follow_up_queue').insert({
        org_id: ctx.org_id,
        lead_id: ctx.lead_id,
        attempt_number: 0,
        max_attempts: 5,
        next_attempt_at: firstAttempt.toISOString(),
        last_lead_message_at: now.toISOString(),
        cadence_hours: [4, 24, 72, 120, 168],
        status: 'pending',
        last_conversation_summary: input.summary,
        lead_stage: lead?.stage || null,
        instance_name: ctx.instance_name,
        agent_id: ctx.agent_id,
        campaign_id: ctx.campaign_id
      })

      console.log(`[SDR:End] Follow-up enfileirado para lead ${ctx.lead_id} — primeira tentativa em ${firstAttempt.toISOString()}`)
    }
  } catch (fuErr: any) {
    console.warn(`[SDR:End] Erro ao enfileirar follow-up (non-fatal): ${fuErr.message}`)
  }

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

  // Atualizar campos diretos do lead quando aplicável
  const leadFieldMap: Record<string, string> = {
    'property_type': 'nicho',            // tipo de imóvel → nicho (casa, apto, terreno)
    'interest': 'interesse',             // tipo de transação → interesse (compra, locação)
    'contact_type': 'tipo_contato',      // perfil do lead → tipo_contato (comprador, vendedor, locatário)
    'lead_city': 'city',                 // cidade onde o lead MORA → city
    'budget': 'total_em_vendas',         // orçamento → valor
    'current_situation': 'tipo_contato', // fallback: situação → tipo_contato
    // 'region' NÃO mapeia para campo direto — é só metadata (região de busca do imóvel)
  }

  const leadColumn = leadFieldMap[fieldKey]
  if (leadColumn) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (leadColumn === 'total_em_vendas') {
      // Extrair número do orçamento — tratar formato BR (4.000,00) e EN (4,000.00)
      let numStr = input.value.replace(/[^\d.,]/g, '') // "4.000,00" ou "4000" ou "4,000.00"
      // Detectar formato brasileiro: se tem ponto seguido de 3 dígitos, é separador de milhar
      if (/\d\.\d{3}/.test(numStr)) {
        numStr = numStr.replace(/\./g, '') // remover pontos de milhar
      }
      numStr = numStr.replace(',', '.') // vírgula decimal → ponto
      const num = parseFloat(numStr)
      if (!isNaN(num)) updateData[leadColumn] = num
    } else {
      updateData[leadColumn] = input.value
    }
    await supabase
      .from('leads')
      .update(updateData)
      .eq('id', ctx.lead_id)
      .eq('org_id', ctx.org_id)
      .then(() => {}).catch(() => {})
  }

  // Registrar na linha do tempo
  await supabase.from('lead_events').insert({
    lead_id: ctx.lead_id,
    type: 'info_collected',
    content: `Agente IA coletou: ${fieldKey} = ${input.value}`
  }).then(() => {}).catch(() => {})

  console.log(`[SDR:Info] Lead ${ctx.lead_id} | ${fieldKey}: ${input.value}`)
  return { success: true, data: { field: fieldKey, value: input.value } }
}

// ─── Search Properties: buscar imóveis no portfólio ───
async function executeSearchProperties(
  input: { property_type?: string; transaction_type?: string; min_price?: number; max_price?: number; min_bedrooms?: number; neighborhood?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  let query = supabase
    .from('properties')
    .select('id, title, slug, property_type, transaction_type, price, condo_fee, bedrooms, suites, bathrooms, parking_spots, total_area, address_neighborhood, address_city, address_state, amenities, external_code, description, images')
    .eq('org_id', ctx.org_id)
    .eq('status', 'active')

  if (input.property_type) query = query.eq('property_type', input.property_type)
  if (input.transaction_type) query = query.eq('transaction_type', input.transaction_type)
  if (input.min_price) query = query.gte('price', input.min_price)
  if (input.max_price) query = query.lte('price', input.max_price)
  if (input.min_bedrooms) query = query.gte('bedrooms', input.min_bedrooms)
  if (input.neighborhood) query = query.ilike('address_neighborhood', `%${input.neighborhood}%`)

  query = query
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: properties, error } = await query

  if (error) return { success: false, error: error.message }

  if (!properties || properties.length === 0) {
    return {
      success: true,
      data: {
        found: 0,
        properties: [],
        message: 'Nenhum imóvel encontrado com esses critérios exatos.',
        tip: 'IMPORTANTE: NÃO diga ao lead que não tem. Primeiro tente buscar novamente com filtros mais amplos: remova transaction_type, aumente max_price em 30%, reduza min_bedrooms em 1, ou remova neighborhood. Só informe ao lead que não encontrou se TODAS as tentativas falharem.'
      }
    }
  }

  // Verificar se a org tem site publicado para gerar links
  const { data: site } = await supabase
    .from('site_settings')
    .select('slug, is_published')
    .eq('org_id', ctx.org_id)
    .single()

  const siteSlug = site?.is_published ? site.slug : null

  const formatted = properties.map(p => {
    const images = Array.isArray(p.images) ? p.images : []
    return {
      id: p.id,
      ref: p.external_code || p.slug || p.id.slice(0, 8),
      title: p.title,
      type: p.property_type,
      transaction: p.transaction_type,
      price: p.price,
      bedrooms: p.bedrooms,
      suites: p.suites,
      bathrooms: p.bathrooms,
      parking: p.parking_spots,
      area: p.total_area,
      neighborhood: p.address_neighborhood,
      city: p.address_city,
      state: p.address_state,
      condo_fee: p.condo_fee,
      amenities: p.amenities,
      description: p.description?.slice(0, 200),
      has_images: images.length > 0,
      image_count: images.length,
      site_url: siteSlug ? `/sites/${siteSlug}/properties/${p.slug || p.id}` : null,
    }
  })

  console.log(`[SDR:SearchProperties] Encontrados ${formatted.length} imóveis | org: ${ctx.org_id}`)
  return {
    success: true,
    data: {
      found: formatted.length,
      properties: formatted,
      tip: 'IMPORTANTE: Use SOMENTE os dados listados acima. Se um campo é null ou não aparece, NÃO invente — diga que vai confirmar com o corretor. Apresente de forma natural, mencionando apenas dados que EXISTEM nos resultados.'
    }
  }
}

// ─── Get Property by Reference: buscar imóvel específico ───
async function executeGetPropertyByRef(
  input: { reference: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const ref = input.reference.trim()

  // Tentar buscar por external_code (REF-1001), slug, ou ID
  let property = null

  // 1. Por external_code (ex: REF-1001)
  const { data: byCode } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', ctx.org_id)
    .eq('status', 'active')
    .ilike('external_code', ref)
    .limit(1)
    .single()

  if (byCode) {
    property = byCode
  } else {
    // 2. Por slug
    const { data: bySlug } = await supabase
      .from('properties')
      .select('*')
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')
      .eq('slug', ref.toLowerCase())
      .limit(1)
      .single()

    if (bySlug) {
      property = bySlug
    } else {
      // 3. Por ID (UUID)
      const { data: byId } = await supabase
        .from('properties')
        .select('*')
        .eq('org_id', ctx.org_id)
        .eq('status', 'active')
        .eq('id', ref)
        .limit(1)
        .single()

      if (byId) property = byId
    }
  }

  if (!property) {
    // 4. Busca parcial no external_code (caso o lead diga só "1001" sem "REF-")
    const { data: byPartial } = await supabase
      .from('properties')
      .select('*')
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')
      .ilike('external_code', `%${ref}%`)
      .limit(1)
      .single()

    if (byPartial) property = byPartial
  }

  if (!property) {
    return {
      success: true,
      data: {
        found: false,
        message: `Imóvel com referência "${ref}" não encontrado. Pode ter sido vendido ou o código estar incorreto.`
      }
    }
  }

  // Verificar se a org tem site publicado
  const { data: site } = await supabase
    .from('site_settings')
    .select('slug, is_published')
    .eq('org_id', ctx.org_id)
    .single()

  const siteSlug = site?.is_published ? site.slug : null

  // Salvar no contexto do lead que ele tem interesse neste imóvel
  await saveMeta(ctx, 'lead_info_property_interest', {
    field: 'property_interest',
    value: property.title,
    property_id: property.id,
    property_ref: property.external_code || property.slug,
    collected_at: new Date().toISOString()
  })

  console.log(`[SDR:GetPropertyByRef] Found: ${property.title} (${ref}) | Lead: ${ctx.lead_id}`)

  return {
    success: true,
    data: {
      found: true,
      property: {
        id: property.id,
        ref: property.external_code || property.slug || property.id.slice(0, 8),
        title: property.title,
        description: property.description,
        type: property.property_type,
        transaction: property.transaction_type,
        price: property.price,
        condo_fee: property.condo_fee,
        iptu: property.iptu,
        bedrooms: property.bedrooms,
        suites: property.suites,
        bathrooms: property.bathrooms,
        parking: property.parking_spots,
        total_area: property.total_area,
        private_area: property.private_area,
        neighborhood: property.address_neighborhood,
        city: property.address_city,
        state: property.address_state,
        address: [property.address_street, property.address_number, property.address_neighborhood, property.address_city].filter(Boolean).join(', '),
        amenities: property.amenities,
        has_images: Array.isArray(property.images) && property.images.length > 0,
        image_count: Array.isArray(property.images) ? property.images.length : 0,
        video_url: property.video_url,
        virtual_tour_url: property.virtual_tour_url,
        site_url: siteSlug ? `/sites/${siteSlug}/properties/${property.slug || property.id}` : null,
      },
      tip: 'REGRA ABSOLUTA: Use SOMENTE os dados acima para falar deste imóvel. Se um campo é null, 0, ou não aparece, NÃO invente — diga "vou confirmar com o corretor". NÃO despeje tudo de uma vez. Se has_images=true, ofereça enviar fotos usando send_property_images.'
    }
  }
}

// ─── Send Property Images: enviar fotos ao lead via WhatsApp ───
async function executeSendPropertyImages(
  input: { property_id: string; max_images?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  const maxImages = Math.min(input.max_images || 3, 4)

  // Buscar propriedade com imagens
  const { data: property, error } = await supabase
    .from('properties')
    .select('id, title, images, external_code, slug')
    .eq('id', input.property_id)
    .eq('org_id', ctx.org_id)
    .eq('status', 'active')
    .single()

  if (error || !property) {
    return { success: false, error: 'Propriedade não encontrada.' }
  }

  const images = Array.isArray(property.images) ? property.images : []
  if (images.length === 0) {
    return {
      success: true,
      data: {
        sent: 0,
        message: 'Esta propriedade não possui fotos cadastradas no momento. Informe ao lead que as fotos serão disponibilizadas em breve.'
      }
    }
  }

  // Ordenar por is_cover primeiro, depois por order
  const sorted = [...images].sort((a: any, b: any) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return (a.order || 0) - (b.order || 0)
  })

  const toSend = sorted.slice(0, maxImages)

  // Buscar instância para enviar via transport
  const { createTransport } = await import('./whatsapp-adapter')
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('api_type, instance_name, instance_token, api_url, phone_number_id, waba_id, cloud_api_token')
    .eq('instance_name', ctx.instance_name)
    .single()

  if (!instance) {
    return { success: false, error: 'Instância WhatsApp não encontrada.' }
  }

  const transport = createTransport(instance as any)
  const phone = ctx.phone.replace(/[^0-9]/g, '')

  let sentCount = 0
  const ref = property.external_code || property.slug || property.id.slice(0, 8)

  for (let i = 0; i < toSend.length; i++) {
    const img = toSend[i] as any
    const imageUrl = img.url

    if (!imageUrl) continue

    try {
      // Primeira imagem com caption (título da propriedade)
      const caption = i === 0 ? `${property.title} (${ref})` : undefined
      await transport.sendImage(phone, imageUrl, caption)
      sentCount++

      // Pequena pausa entre imagens para não parecer spam
      if (i < toSend.length - 1) {
        await new Promise(r => setTimeout(r, 1500))
      }
    } catch (err: any) {
      console.error(`[SDR:SendImages] Erro ao enviar imagem ${i + 1}: ${err.message}`)
    }
  }

  console.log(`[SDR:SendImages] ${sentCount}/${toSend.length} fotos enviadas para ${phone} | property: ${ref}`)

  return {
    success: true,
    data: {
      sent: sentCount,
      total_available: images.length,
      message: sentCount > 0
        ? `${sentCount} foto(s) enviada(s) ao lead.`
        : 'Não foi possível enviar as fotos no momento.'
    }
  }
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
