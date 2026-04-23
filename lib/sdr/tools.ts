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
  org_language?: string  // 'pt', 'en', 'es' — para traduzir amenidades etc.
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
    description: 'Busca imóveis disponíveis no portfólio. Filtra por tipo, região, quartos, preço e amenidade. Quando o lead pedir algo como churrasqueira, piscina, mobiliado etc, use o parâmetro "amenity". Máximo 1 busca por vez.',
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
        },
        amenity: {
          type: 'string',
          description: 'Amenidade desejada (opcional). Ex: "Piscina", "Churrasqueira", "Mobiliado", "Jardim", "Ar condicionado", "Elevador", "Portaria 24h", "Segurança", "Energia solar", "Condomínio fechado", "Acessibilidade"'
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
  // Validação: rejeitar stages inválidos antes de qualquer coisa
  const VALID_SEMANTIC_STAGES = ['new', 'qualifying', 'qualified', 'visit_scheduled', 'negotiation', 'won', 'lost']
  const inputStage = (input.stage || '').trim().toLowerCase()

  if (!inputStage || inputStage === 'null' || inputStage === 'undefined' || !VALID_SEMANTIC_STAGES.includes(inputStage)) {
    console.warn(`[SDR:Qualify] Stage inválido rejeitado: "${input.stage}" — ignorando`)
    return {
      success: false,
      error: `Stage "${input.stage}" não é válido. Stages aceitos: ${VALID_SEMANTIC_STAGES.join(', ')}`
    }
  }

  // Buscar stages do pipeline ativo da org para mapear corretamente
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('name, label, position')
    .eq('org_id', ctx.org_id)
    .eq('is_active', true)
    .order('position')

  // Mapear stage do agente para stage real do pipeline
  let targetStage = inputStage
  if (stages && stages.length > 0) {
    // Tentar match direto
    const directMatch = stages.find(s => s.name === inputStage)
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
      const aliases = stageMap[inputStage] || [inputStage]
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
        const pos = positionMap[inputStage]
        if (pos !== undefined && pos < stages.length) {
          targetStage = stages[Math.min(pos, stages.length - 1)].name
        }
      }
    }
  }

  // Validação final: nunca gravar null/undefined/empty no banco
  if (!targetStage || targetStage === 'null' || targetStage === 'undefined') {
    console.warn(`[SDR:Qualify] targetStage resolveu para valor inválido: "${targetStage}" — abortando`)
    return { success: false, error: 'Stage não pôde ser mapeado para um valor válido' }
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

  // Registrar na linha do tempo (com dados estruturados pros relatórios de fluxo)
  await supabase.from('lead_events').insert({
    lead_id: ctx.lead_id,
    type: 'stage_change',
    content: `Agente IA alterou etapa de ${previousStage} para ${targetStage}. Motivo: ${input.reason}`,
    details: {
      from_stage: previousStage,
      to_stage: targetStage,
      source: 'sdr_agent',
      reason: input.reason,
    },
    user_id: null, // SDR não tem user_id — reporta como "Agente IA"
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

  const { data: createdEvent } = await supabase.from('calendar_events').insert({
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
  }).select('*').single()

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

  // Push pro Google Calendar do owner (se tiver integração ativa)
  if (owner && createdEvent) {
    try {
      const { pushEventToGoogle } = await import('@/lib/integrations/calendar-sync')
      await pushEventToGoogle({ userId: owner.id, event: createdEvent as any })
    } catch (e) {
      // Silencioso — best-effort
    }
  }

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

  // Gerar referência de dias para ajudar o modelo
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  return {
    success: true,
    data: {
      calendar_integrated: true,
      today: todayStr,
      tomorrow: tomorrowStr,
      busy_slots: busySlots,
      total_events: busySlots.length,
      suggested_hours: 'Horário comercial: seg-sex 9h às 18h | sáb 9h às 12h',
      instruction: busySlots.length === 0
        ? `Não há compromissos entre ${input.date_from} e ${dateTo}. Todos os horários em horário comercial estão livres. Sugira 2-3 opções específicas ao lead.`
        : `ATENÇÃO: Há ${busySlots.length} compromisso(s) ocupado(s). Analise os horários ocupados (from/to) e sugira APENAS horários que NÃO caiam dentro desses intervalos. Ex: se há evento das 15:00 às 17:00, qualquer horário entre 15:00 e 16:59 está INDISPONÍVEL. Sugira horários ANTES ou DEPOIS dos slots ocupados.`
    }
  }
}

// ─── Reschedule Visit: reagendar evento existente ───
async function executeRescheduleVisit(
  input: { new_date: string; new_time: string; reason?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  // Buscar evento agendado mais recente do lead — ignora eventos vindos do Google
  // (external_read_only=true são espelhos; a Oryen não remarca no Google via SDR)
  const { data: event, error: findErr } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, start_time, external_id, external_integration_id, external_read_only')
    .eq('org_id', ctx.org_id)
    .eq('lead_id', ctx.lead_id)
    .eq('status', 'scheduled')
    .eq('external_read_only', false)
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
  const { data: updatedEvent, error: updateErr } = await supabase
    .from('calendar_events')
    .update({
      event_date: input.new_date,
      start_time: input.new_time,
      end_time: endTime,
      notes: input.reason ? `Reagendado: ${input.reason}` : 'Reagendado pelo lead',
      updated_at: new Date().toISOString()
    })
    .eq('id', event.id)
    .select('*')
    .single()

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

    // Push da atualização pro Google Calendar do owner (se evento estava linkado)
    if (updatedEvent?.external_id && !updatedEvent.external_read_only) {
      try {
        const { pushEventUpdate } = await import('@/lib/integrations/calendar-sync')
        await pushEventUpdate({ userId: owner.id, event: updatedEvent as any })
      } catch (e) {
        // Silencioso — best-effort
      }
    }
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
  // Validação: rejeitar nomes inválidos
  const cleanName = (input.name || '').trim()
  if (
    !cleanName ||
    cleanName.toLowerCase() === 'null' ||
    cleanName.toLowerCase() === 'undefined' ||
    cleanName.toLowerCase() === 'não informado' ||
    cleanName.toLowerCase() === 'n/a' ||
    cleanName.length < 2
  ) {
    console.warn(`[SDR:Name] Nome inválido rejeitado: "${input.name}" — ignorando`)
    return { success: false, error: `Nome "${input.name}" não é válido` }
  }

  const { error } = await supabase
    .from('leads')
    .update({ name: cleanName, updated_at: new Date().toISOString() })
    .eq('id', ctx.lead_id)
    .eq('org_id', ctx.org_id)

  if (error) return { success: false, error: error.message }

  console.log(`[SDR:Name] Lead ${ctx.lead_id} → "${cleanName}"`)
  return { success: true, data: { name: cleanName } }
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

  // Enfileirar para follow-up automático SOMENTE se NÃO houve conversão
  // Conversão = visita agendada, qualificado, venda fechada, etc.
  // Follow-up é para leads que pararam de responder SEM converter
  const CONVERSION_REASONS = [
    'visita_agendada', 'visit_scheduled', 'qualified', 'qualificado',
    'won', 'venda_fechada', 'sale_closed', 'deal_closed',
    'lead_requested_stop', 'spam', 'incompatible',
  ]
  const reasonLower = input.reason.toLowerCase().replace(/\s+/g, '_')
  const isConversion = CONVERSION_REASONS.some(r => reasonLower.includes(r))

  if (!isConversion) {
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
  } else {
    console.log(`[SDR:End] Conversão detectada (${input.reason}) — follow-up NÃO criado para lead ${ctx.lead_id}`)
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

// ─── Mapa de sinônimos: termo do lead (PT/EN/ES) → key do banco ───
const AMENITY_SYNONYMS: Record<string, string> = {
  // PT
  'piscina': 'pool', 'academia': 'gym', 'playground': 'playground',
  'espaço gourmet': 'gourmet_area', 'espaco gourmet': 'gourmet_area', 'gourmet': 'gourmet_area',
  'churrasqueira': 'barbecue', 'churrasco': 'barbecue', 'bbq': 'barbecue', 'area de churrasco': 'barbecue',
  'sauna': 'sauna', 'salão de festas': 'party_room', 'salao de festas': 'party_room', 'salão de festa': 'party_room',
  'elevador': 'elevator', 'portaria': 'doorman', 'portaria 24h': 'doorman', 'porteiro': 'doorman',
  'segurança': 'security', 'seguranca': 'security', 'jardim': 'garden',
  'sacada': 'balcony', 'varanda': 'balcony', 'varanda gourmet': 'balcony', 'terraço': 'balcony', 'terraco': 'balcony',
  'mobiliado': 'furnished', 'mobilhado': 'furnished', 'mobilia': 'furnished',
  'ar condicionado': 'air_conditioning', 'ar-condicionado': 'air_conditioning', 'climatizado': 'air_conditioning',
  'lavanderia': 'laundry', 'aceita pets': 'pet_friendly', 'pet friendly': 'pet_friendly', 'aceita animais': 'pet_friendly',
  'energia solar': 'solar_energy', 'solar': 'solar_energy', 'lareira': 'fireplace',
  'closet': 'closet', 'home office': 'home_office', 'escritório': 'home_office', 'escritorio': 'home_office',
  'acesso asfaltado': 'paved_access', 'asfalto': 'paved_access',
  'água encanada': 'water_supply', 'agua encanada': 'water_supply',
  'esgoto': 'sewage', 'fossa': 'sewage',
  'energia elétrica': 'electricity', 'energia eletrica': 'electricity', 'luz': 'electricity',
  'gás encanado': 'natural_gas', 'gas encanado': 'natural_gas', 'gás': 'natural_gas',
  'terreno plano': 'flat_terrain', 'plano': 'flat_terrain',
  'cercado': 'fenced', 'murado': 'fenced', 'muro': 'fenced',
  'esquina': 'corner_lot', 'condomínio fechado': 'gated_community', 'condominio fechado': 'gated_community',
  'iluminação pública': 'street_lighting', 'iluminacao publica': 'street_lighting',
  'recepção': 'reception', 'recepcao': 'reception',
  'sala de reunião': 'meeting_room', 'sala de reuniao': 'meeting_room',
  'doca': 'loading_dock', 'acessibilidade': 'handicap_access', 'acessível': 'handicap_access',
  'poço artesiano': 'well', 'poco artesiano': 'well', 'poço': 'well',
  'curral': 'corral', 'galpão': 'barn', 'galpao': 'barn',
  'pomar': 'fruit_trees', 'acesso a rio': 'river_access', 'lago': 'river_access',
  // EN
  'pool': 'pool', 'gym': 'gym', 'barbecue': 'barbecue', 'balcony': 'balcony',
  'elevator': 'elevator', 'garden': 'garden', 'security': 'security', 'furnished': 'furnished',
  'fireplace': 'fireplace', 'sauna': 'sauna', 'laundry': 'laundry',
  // ES
  'parrilla': 'barbecue', 'gimnasio': 'gym', 'balcón': 'balcony', 'balcon': 'balcony',
  'ascensor': 'elevator', 'seguridad': 'security', 'amueblado': 'furnished',
  'chimenea': 'fireplace', 'jardín': 'garden', 'jardin': 'garden',
}

// Traduz amenidades da key (EN) para o idioma da org usando ALL_AMENITIES
import { ALL_AMENITIES } from '@/lib/properties/constants'

function translateAmenities(keys: string[], lang: string = 'pt'): string[] {
  const l = (lang === 'pt' || lang === 'en' || lang === 'es') ? lang : 'pt'
  return keys.map(k => {
    const found = ALL_AMENITIES.find(a => a.key === k)
    return found ? found.label[l as 'pt' | 'en' | 'es'] : k
  })
}

function resolveAmenityKey(term: string): string {
  // Busca exata no mapa
  if (AMENITY_SYNONYMS[term]) return AMENITY_SYNONYMS[term]

  // Busca parcial (ex: "churrasq" casa com "churrasqueira")
  for (const [synonym, key] of Object.entries(AMENITY_SYNONYMS)) {
    if (synonym.includes(term) || term.includes(synonym)) return key
  }

  // Se não encontrou no mapa, retorna o termo original (pode ser a key direta)
  return term
}

// ─── Search Properties: buscar imóveis no portfólio ───
async function executeSearchProperties(
  input: { property_type?: string; transaction_type?: string; min_price?: number; max_price?: number; min_bedrooms?: number; neighborhood?: string; amenity?: string },
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

  // Amenity: resolver termo do lead → key do banco usando mapa de sinônimos
  const amenityRaw = input.amenity?.toLowerCase().trim()
  const amenityKey = amenityRaw ? resolveAmenityKey(amenityRaw) : null

  query = query
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(amenityKey ? 20 : 5)  // buscar mais se tem filtro de amenidade

  const { data: allProperties, error } = await query

  if (error) return { success: false, error: error.message }

  // Filtrar por amenidade: comparar key resolvida com keys no banco
  let properties = allProperties
  if (amenityKey && properties) {
    properties = properties.filter(p => {
      const amenities = Array.isArray(p.amenities) ? p.amenities : []
      return amenities.some((a: string) => a.toLowerCase() === amenityKey)
    })
  }

  // Limitar a 5 resultados após filtro
  if (properties && properties.length > 5) {
    properties = properties.slice(0, 5)
  }

  // Se amenidade filtrou para 0 resultados mas existem imóveis sem essa amenidade → mostrar sem filtro
  let amenityNotFound = false
  if (amenityKey && (!properties || properties.length === 0) && allProperties && allProperties.length > 0) {
    properties = allProperties.slice(0, 5)
    amenityNotFound = true
    console.log(`[SDR:SearchProperties] Amenidade "${amenityKey}" não encontrada — mostrando ${properties.length} imóvel(is) sem filtro de amenidade`)
  }

  // Se não encontrou e tinha filtro de preço, retry automático com margem de ±20%
  let usedPriceMargin = false
  if ((!properties || properties.length === 0) && (input.max_price || input.min_price)) {
    console.log(`[SDR:SearchProperties] 0 resultados com preço exato — retry com margem ±20%`)

    let retryQuery = supabase
      .from('properties')
      .select('id, title, slug, property_type, transaction_type, price, condo_fee, bedrooms, suites, bathrooms, parking_spots, total_area, address_neighborhood, address_city, address_state, amenities, external_code, description, images')
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')

    if (input.property_type) retryQuery = retryQuery.eq('property_type', input.property_type)
    if (input.transaction_type) retryQuery = retryQuery.eq('transaction_type', input.transaction_type)
    if (input.min_price) retryQuery = retryQuery.gte('price', input.min_price * 0.8)
    if (input.max_price) retryQuery = retryQuery.lte('price', input.max_price * 1.2)
    if (input.min_bedrooms) retryQuery = retryQuery.gte('bedrooms', input.min_bedrooms)
    if (input.neighborhood) retryQuery = retryQuery.ilike('address_neighborhood', `%${input.neighborhood}%`)

    retryQuery = retryQuery
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(amenityKey ? 20 : 5)

    const { data: retryProperties } = await retryQuery

    // Filtrar amenidade se necessário
    let retryFiltered = retryProperties || []
    if (amenityKey && retryFiltered.length > 0) {
      retryFiltered = retryFiltered.filter(p => {
        const am = Array.isArray(p.amenities) ? p.amenities : []
        return am.some((a: string) => a.toLowerCase() === amenityKey)
      })
    }
    if (retryFiltered.length > 5) retryFiltered = retryFiltered.slice(0, 5)

    if (retryFiltered.length > 0) {
      properties = retryFiltered
      usedPriceMargin = true
      console.log(`[SDR:SearchProperties] Retry encontrou ${properties.length} imóvel(is) com margem de preço`)
    }
  }

  // Se não encontrou e tinha filtro de bairro, buscar imóveis em bairros próximos
  let usedCityFallback = false
  let nearbySearchKm: number | null = null
  if ((!properties || properties.length === 0) && input.neighborhood) {
    console.log(`[SDR:SearchProperties] 0 resultados no bairro "${input.neighborhood}" — buscando bairros próximos`)

    // Buscar todos imóveis da mesma cidade com lat/lng (para calcular distância)
    let nearbyQuery = supabase
      .from('properties')
      .select('id, title, slug, property_type, transaction_type, price, condo_fee, bedrooms, suites, bathrooms, parking_spots, total_area, address_neighborhood, address_city, address_state, amenities, external_code, description, images, latitude, longitude')
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (input.property_type) nearbyQuery = nearbyQuery.eq('property_type', input.property_type)
    if (input.transaction_type) nearbyQuery = nearbyQuery.eq('transaction_type', input.transaction_type)
    if (input.min_price) nearbyQuery = nearbyQuery.gte('price', usedPriceMargin ? input.min_price * 0.8 : input.min_price)
    if (input.max_price) nearbyQuery = nearbyQuery.lte('price', usedPriceMargin ? input.max_price * 1.2 : input.max_price)
    if (input.min_bedrooms) nearbyQuery = nearbyQuery.gte('bedrooms', input.min_bedrooms)

    nearbyQuery = nearbyQuery.limit(50) // buscar mais para filtrar por distância

    const { data: nearbyProperties } = await nearbyQuery

    if (nearbyProperties && nearbyProperties.length > 0) {
      // Geocodificar o bairro pedido para ter ponto de referência
      const { geocodeNeighborhood, distanceKm } = await import('@/lib/properties/geocoder')

      // Buscar cidade da org para contexto
      const { data: orgRow } = await supabase
        .from('orgs')
        .select('country')
        .eq('id', ctx.org_id)
        .single()

      // Tentar descobrir a cidade dos imóveis existentes
      const sampleCity = nearbyProperties[0]?.address_city || null
      const sampleState = nearbyProperties[0]?.address_state || null

      const refPoint = await geocodeNeighborhood(
        input.neighborhood,
        sampleCity,
        sampleState,
        orgRow?.country || null
      )

      if (refPoint) {
        // Calcular distância e ordenar por proximidade (max 10km)
        const MAX_RADIUS_KM = 10
        const withDistance = nearbyProperties
          .map(p => ({
            ...p,
            _distance: distanceKm(refPoint.latitude, refPoint.longitude, p.latitude, p.longitude)
          }))
          .filter(p => p._distance <= MAX_RADIUS_KM)
          .sort((a, b) => a._distance - b._distance)

        // Filtrar por amenidade se necessário
        let nearbyFiltered = withDistance
        if (amenityKey && nearbyFiltered.length > 0) {
          nearbyFiltered = nearbyFiltered.filter(p => {
            const am = Array.isArray(p.amenities) ? p.amenities : []
            return am.some((a: string) => a.toLowerCase() === amenityKey)
          })
        }

        if (nearbyFiltered.length > 5) nearbyFiltered = nearbyFiltered.slice(0, 5)

        if (nearbyFiltered.length > 0) {
          properties = nearbyFiltered
          usedCityFallback = true
          nearbySearchKm = Math.round(nearbyFiltered[nearbyFiltered.length - 1]._distance * 10) / 10
          console.log(`[SDR:SearchProperties] Proximidade: ${nearbyFiltered.length} imóvel(is) em até ${nearbySearchKm}km do bairro "${input.neighborhood}"`)
        }
      }
    }

    // Fallback final: se não tem imóveis geocodificados, busca por cidade
    if (!properties || properties.length === 0) {
      let cityQuery = supabase
        .from('properties')
        .select('id, title, slug, property_type, transaction_type, price, condo_fee, bedrooms, suites, bathrooms, parking_spots, total_area, address_neighborhood, address_city, address_state, amenities, external_code, description, images')
        .eq('org_id', ctx.org_id)
        .eq('status', 'active')

      if (input.property_type) cityQuery = cityQuery.eq('property_type', input.property_type)
      if (input.transaction_type) cityQuery = cityQuery.eq('transaction_type', input.transaction_type)
      if (input.min_price) cityQuery = cityQuery.gte('price', usedPriceMargin ? input.min_price * 0.8 : input.min_price)
      if (input.max_price) cityQuery = cityQuery.lte('price', usedPriceMargin ? input.max_price * 1.2 : input.max_price)
      if (input.min_bedrooms) cityQuery = cityQuery.gte('bedrooms', input.min_bedrooms)

      cityQuery = cityQuery
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(amenityKey ? 20 : 5)

      const { data: cityProperties } = await cityQuery

      let cityFiltered = cityProperties || []
      if (amenityKey && cityFiltered.length > 0) {
        cityFiltered = cityFiltered.filter(p => {
          const am = Array.isArray(p.amenities) ? p.amenities : []
          return am.some((a: string) => a.toLowerCase() === amenityKey)
        })
      }
      if (cityFiltered.length > 5) cityFiltered = cityFiltered.slice(0, 5)

      if (cityFiltered.length > 0) {
        properties = cityFiltered
        usedCityFallback = true
        console.log(`[SDR:SearchProperties] Fallback cidade (sem geo): ${properties.length} imóvel(is)`)
      }
    }
  }

  if (!properties || properties.length === 0) {
    return {
      success: true,
      data: {
        found: 0,
        properties: [],
        message: 'Nenhum imóvel encontrado com esses critérios.',
        tip: 'Informe ao lead que não encontrou opções com esse perfil no momento, mas pergunte se pode buscar com outros critérios (outra região, outro tipo de imóvel, etc.).'
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
    const entry: any = {
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
      amenities: Array.isArray(p.amenities) ? translateAmenities(p.amenities, ctx.org_language) : [],
      amenities_summary: Array.isArray(p.amenities) && p.amenities.length > 0
        ? `Este imóvel TEM: ${translateAmenities(p.amenities, ctx.org_language).join(', ')}`
        : 'Sem amenidades cadastradas',
      description: p.description?.slice(0, 200),
      has_images: images.length > 0,
      image_count: images.length,
      site_url: siteSlug ? `/sites/${siteSlug}/properties/${p.slug || p.id}` : null,
    }
    // Incluir distância do bairro pedido (se calculada)
    if (p._distance !== undefined) {
      entry.distance_km = Math.round(p._distance * 10) / 10
    }
    return entry
  })

  console.log(`[SDR:SearchProperties] Encontrados ${formatted.length} imóveis | org: ${ctx.org_id}${usedPriceMargin ? ' (margem de preço)' : ''}${amenityNotFound ? ` (sem ${input.amenity})` : ''}`)

  // Resolver label da amenidade para o tip (mostrar em português para o agente)
  const amenityLabel = input.amenity || ''

  const tip = amenityNotFound
    ? `ATENÇÃO: Não encontrei imóveis com "${amenityLabel}" no portfólio. Mas encontrei estas opções que podem interessar ao lead. Apresente naturalmente: "Com ${amenityLabel} não tenho disponível no momento, mas tenho essas opções que podem te interessar". Mostre os imóveis e pergunte se algum chama atenção. Veja o campo "amenities" de cada imóvel para mencionar o que eles TÊM.`
    : usedCityFallback && nearbySearchKm
    ? `ATENÇÃO: Não encontrei imóveis no bairro "${input.neighborhood}", mas encontrei opções em bairros próximos (até ${nearbySearchKm}km). Cada imóvel tem "distance_km" indicando a distância. Apresente naturalmente: "No ${input.neighborhood} não tenho no momento, mas achei uma opção ótima no [BAIRRO], que fica bem pertinho, a menos de Xkm". NÃO pergunte se aceita outro bairro — já apresente a sugestão direto.`
    : usedCityFallback
    ? `ATENÇÃO: Não encontrei imóveis no bairro "${input.neighborhood}", mas encontrei opções em outros bairros da região. Apresente naturalmente: "No ${input.neighborhood} não tenho no momento, mas achei uma opção ótima no [BAIRRO] que pode te interessar". NÃO pergunte se aceita outro bairro — já apresente a sugestão direto.`
    : usedPriceMargin
      ? 'ATENÇÃO: Não encontrei no valor exato que o lead pediu, mas encontrei opções próximas (±20%). Apresente naturalmente: "No valor exato não encontrei, mas tenho uma opção muito boa por R$ X que pode te interessar". NÃO pergunte se o lead aceita outro valor — já apresente a sugestão direto.'
      : 'IMPORTANTE: Use SOMENTE os dados listados acima. Se um campo é null ou não aparece, NÃO invente — diga que vai confirmar com o corretor. Apresente de forma natural.'

  // Persistir dados dos imóveis apresentados para contexto em turnos futuros
  // (o histórico só carrega role+body, tool_results se perdem entre turnos)
  if (formatted.length > 0) {
    const propertySummaries = formatted.map((p: any) =>
      `[${p.ref}] ${p.title} | ${p.neighborhood}, ${p.city} | R$ ${p.price} | ${p.bedrooms}q | ${p.amenities_summary}`
    ).join('\n')

    await supabase.from('sdr_messages').insert({
      org_id: ctx.org_id,
      lead_id: ctx.lead_id,
      campaign_id: ctx.campaign_id || null,
      instance_name: ctx.instance_name,
      phone: ctx.phone,
      role: 'system',
      body: `[Imóveis apresentados ao lead]\n${propertySummaries}`,
      type: 'context',
    })
  }

  return {
    success: true,
    data: {
      found: formatted.length,
      properties: formatted,
      price_margin_applied: usedPriceMargin,
      city_fallback_applied: usedCityFallback,
      amenity_not_found: amenityNotFound || undefined,
      searched_amenity: amenityNotFound ? amenityLabel : undefined,
      searched_neighborhood: usedCityFallback ? input.neighborhood : undefined,
      tip
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
        amenities: Array.isArray(property.amenities) ? translateAmenities(property.amenities, ctx.org_language) : [],
        amenities_summary: Array.isArray(property.amenities) && property.amenities.length > 0
          ? `Este imóvel TEM: ${translateAmenities(property.amenities, ctx.org_language).join(', ')}`
          : 'Sem amenidades cadastradas',
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
  const propId = input.property_id?.trim()

  console.log(`[SDR:SendImages] Iniciando envio | property_id: ${propId} | lead: ${ctx.lead_id}`)

  if (!propId) {
    return { success: false, error: 'property_id não fornecido.' }
  }

  // Buscar propriedade por ID, external_code (REF-xxx) ou slug
  let property: any = null

  // Tentativa 1: por UUID
  if (propId.length > 20) {
    const { data } = await supabase
      .from('properties')
      .select('id, title, images, external_code, slug')
      .eq('id', propId)
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')
      .single()
    property = data
  }

  // Tentativa 2: por external_code (REF-1001)
  if (!property) {
    const { data } = await supabase
      .from('properties')
      .select('id, title, images, external_code, slug')
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')
      .ilike('external_code', propId)
      .single()
    property = data
  }

  // Tentativa 3: por slug
  if (!property) {
    const { data } = await supabase
      .from('properties')
      .select('id, title, images, external_code, slug')
      .eq('org_id', ctx.org_id)
      .eq('status', 'active')
      .eq('slug', propId)
      .single()
    property = data
  }

  if (!property) {
    console.error(`[SDR:SendImages] Propriedade NÃO encontrada | input: ${propId} | org: ${ctx.org_id}`)
    return { success: false, error: `Propriedade não encontrada com ID/REF "${propId}".` }
  }

  console.log(`[SDR:SendImages] Propriedade encontrada: ${property.title} (${property.external_code || property.id})`)

  const images = Array.isArray(property.images) ? property.images : []
  if (images.length === 0) {
    return {
      success: true,
      data: {
        sent: 0,
        message: 'Esta propriedade ainda não tem fotos cadastradas.',
        tip: 'Diga ao lead de forma natural: "As fotos desse imóvel ainda estão sendo preparadas, mas posso te contar mais sobre ele ou agendar uma visita pra você conhecer pessoalmente. O que prefere?"'
      }
    }
  }

  const ref = property.external_code || property.slug || property.id.slice(0, 8)

  // ─── Verificar quais fotos já foram enviadas para este lead/imóvel ───
  const { data: prevSent } = await supabase
    .from('sdr_messages')
    .select('body')
    .eq('lead_id', ctx.lead_id)
    .eq('org_id', ctx.org_id)
    .eq('type', 'image')
    .eq('role', 'assistant')
    .ilike('body', `%${property.id}%`)

  // Extrair URLs já enviadas do histórico
  const alreadySentUrls = new Set<string>()
  if (prevSent) {
    for (const msg of prevSent) {
      const urlMatch = msg.body.match(/\|urls:(.+?)[\]\s]*$/)
      if (urlMatch) {
        urlMatch[1].split(',').forEach((u: string) => alreadySentUrls.add(u.trim()))
      }
    }
  }

  // Ordenar por is_cover primeiro, depois por order
  const sorted = [...images].sort((a: any, b: any) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return (a.order || 0) - (b.order || 0)
  })

  // Filtrar fotos já enviadas
  const notYetSent = sorted.filter((img: any) => img.url && !alreadySentUrls.has(img.url))

  // Se todas as fotos já foram enviadas → não reenviar
  if (notYetSent.length === 0) {
    console.log(`[SDR:SendImages] TODAS as ${images.length} fotos de ${ref} já foram enviadas para ${ctx.phone}`)
    return {
      success: true,
      data: {
        sent: 0,
        already_sent_all: true,
        total_photos: images.length,
        property_title: property.title,
        property_ref: ref,
        message: `Todas as ${images.length} fotos de "${property.title}" já foram enviadas anteriormente.`,
        tip: `Você JÁ enviou TODAS as fotos deste imóvel ao lead. NÃO envie novamente. Se o lead gostou, conduza para visita de forma natural: "Pessoalmente é ainda melhor! Consigo encaixar uma visita amanhã, funciona pra você?" Se o lead quer ver OUTROS imóveis, use search_properties para buscar novas opções.`
      }
    }
  }

  const toSend = notYetSent.slice(0, maxImages)

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
  const sentUrls: string[] = []

  for (let i = 0; i < toSend.length; i++) {
    const img = toSend[i] as any
    const imageUrl = img.url

    if (!imageUrl) continue

    try {
      const caption = i === 0 ? `${property.title} (${ref})` : undefined
      await transport.sendImage(phone, imageUrl, caption)
      sentCount++
      sentUrls.push(imageUrl)

      if (i < toSend.length - 1) {
        await new Promise(r => setTimeout(r, 1500))
      }
    } catch (err: any) {
      console.error(`[SDR:SendImages] Erro ao enviar imagem ${i + 1}: ${err.message}`)
    }
  }

  const totalSentSoFar = alreadySentUrls.size + sentCount
  const remainingPhotos = images.length - totalSentSoFar

  console.log(`[SDR:SendImages] ${sentCount} novas fotos enviadas para ${phone} | property: ${ref} | total enviadas: ${totalSentSoFar}/${images.length} | restantes: ${remainingPhotos}`)

  // Registrar no histórico com URLs para rastreamento de duplicatas
  if (sentCount > 0) {
    const bodyLog = `[Fotos enviadas: ${property.title} (${ref}) — ${sentCount} foto(s) | prop_id:${property.id} |urls:${sentUrls.join(',')}]`
    await supabase.from('sdr_messages').insert({
      org_id: ctx.org_id,
      lead_id: ctx.lead_id,
      campaign_id: ctx.campaign_id || null,
      instance_name: ctx.instance_name,
      phone: ctx.phone,
      role: 'assistant',
      body: bodyLog,
      type: 'image',
    })

    try {
      await supabase.rpc('fn_insert_message', {
        p_org_id: ctx.org_id,
        p_lead_id: ctx.lead_id,
        p_channel: 'whatsapp',
        p_direction: 'outbound',
        p_body: `[Fotos: ${property.title} (${ref}) — ${sentCount} foto(s)]`,
        p_sender_type: 'agent_bot',
        p_sender_name: 'SDR Agent',
        p_message_type: 'image',
        p_timestamp: new Date().toISOString(),
      })
    } catch {}
  }

  return {
    success: true,
    data: {
      sent: sentCount,
      total_sent_so_far: totalSentSoFar,
      total_available: images.length,
      remaining_photos: remainingPhotos,
      property_title: property.title,
      property_ref: ref,
      message: `${sentCount} foto(s) novas de "${property.title}" enviadas. Total enviadas: ${totalSentSoFar}/${images.length}.`,
      tip: remainingPhotos > 0
        ? `As fotos JÁ CHEGARAM no WhatsApp do lead. NÃO mencione o envio. Responda com "O que achou?" ou "Te chamou atenção?". Ainda restam ${remainingPhotos} foto(s) deste imóvel que podem ser enviadas depois se o lead pedir.`
        : `As fotos JÁ CHEGARAM no WhatsApp do lead. NÃO mencione o envio. Você já enviou TODAS as ${images.length} fotos deste imóvel. Se o lead gostou, conduza para visita: "Pessoalmente é ainda melhor! Consigo encaixar amanhã, funciona pra você?" NÃO ofereça mais fotos deste imóvel.`
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
