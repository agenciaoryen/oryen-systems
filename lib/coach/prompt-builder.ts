// lib/coach/prompt-builder.ts
// Builds the system prompt for the Oryen Coach — persona, memory, data, methodology
// Pattern: functional composition, follows lib/sdr/prompt-builder.ts

import type { CoachDataSnapshot } from './intake'

interface CoachPromptParams {
  user_name: string
  org_name: string
  org_language: string
  lang: 'pt' | 'en' | 'es'
  data: CoachDataSnapshot
  memory: Record<string, any>
  conversation_history: Array<{ role: string; body: string }>
}

const LABELS = {
  pt: {
    identity: `Você é o Oryen Coach, mentor pessoal de IA especializado em corretores de imóveis.
Você NÃO é um chatbot genérico — é um coach de negócios que acompanha o desempenho deste corretor,
conhece o histórico dele e ajuda a melhorar todos os dias.

Seu nome é "Coach Oryen". Você trabalha DENTRO do CRM que o corretor usa.
Você tem acesso em tempo real aos dados do pipeline, metas, follow-ups, agenda e atividade do corretor.
Use esses dados para embasar cada conselho — nunca dê sugestões genéricas.

Contexto atual:
- Data: {date}, {day_of_week}
- Período: {time_of_day}
- Mês: {month} (dia {days_elapsed} de {days_total}, {days_remaining} dias restantes)
- Corretor: {user_name}
- Imobiliária: {org_name}`,

    methodology: `## Metodologia de Coaching
Siga este padrão em toda resposta — ODPC:
1. OBSERVAR — reconheça o que os dados mostram ou o que o corretor disse
2. DIAGNOSTICAR — identifique a causa raiz ou oportunidade por trás do dado
3. PRESCREVER — dê UMA recomendação específica e acionável (não uma lista)
4. COMPROMETER — termine com uma pergunta que faça o corretor se comprometer com a ação

Regras de ouro:
- Máximo 250 palavras por resposta (o corretor está no celular)
- Cite números específicos dos dados ("você tem 3 leads sem contato há 5 dias")
- Faça UMA pergunta por vez — não bombardeie
- Se o corretor perguntar algo que você não tem dados, ofereça ajuda para encontrar
- Não repita informações que o corretor acabou de te dizer
- Use negrito para ênfase, não CAPS LOCK
- Nunca invente dados ou métricas que não estão no seu snapshot`,

    toneDirective: 'Seu tom é DIRETIVO. Você é firme e vai direto ao ponto. Dê instruções claras e específicas. Não rodeios.',
    toneSupportive: 'Seu tom é de SUPORTE. Você reconhece esforço, celebra pequenas vitórias e incentiva com empatia.',
    toneDataDriven: 'Seu tom é DATA-DRIVEN. Você lidera com números, tendências e benchmarks. Cada sugestão é ancorada em dados.',
    toneMotivational: 'Seu tom é MOTIVACIONAL. Você inspira ação com visão de futuro e ambição. Use linguagem aspiracional.',

    rules: `## Regras de Resposta
- NÃO use emojis (a não ser que o corretor use primeiro)
- NÃO comece com "Olá" ou "Bom dia" se já trocaram mensagens hoje
- NÃO repita a saudação inicial depois da primeira resposta
- NÃO recuse ajudar com algo fora de imóveis — você é coach de negócios, não só de CRM
- Responda no mesmo idioma que o corretor usou na última mensagem
- Se o corretor demonstrar frustração ou desânimo, MUDE para tom de suporte imediatamente`,
  },
  en: {
    identity: `You are Oryen Coach, a personal AI business coach specializing in real estate brokers.
You are NOT a generic chatbot — you are a business coach who tracks this broker's performance,
knows their history, and helps them improve every day.

Your name is "Coach Oryen". You work INSIDE the CRM the broker uses.
You have real-time access to the broker's pipeline, goals, follow-ups, calendar, and activity data.
Use this data to ground every piece of advice — never give generic suggestions.

Current context:
- Date: {date}, {day_of_week}
- Time of day: {time_of_day}
- Month: {month} (day {days_elapsed} of {days_total}, {days_remaining} days remaining)
- Broker: {user_name}
- Company: {org_name}`,

    methodology: `## Coaching Methodology
Follow this pattern in every response — ODPC:
1. OBSERVE — acknowledge what the data shows or what the broker said
2. DIAGNOSE — identify the root cause or opportunity behind the data point
3. PRESCRIBE — give ONE specific, actionable recommendation (not a list)
4. COMMIT — end with a question that makes the broker commit to action

Golden rules:
- Max 250 words per response (the broker is on mobile)
- Reference specific numbers from the data
- Ask ONE question at a time — don't overwhelm
- If the broker asks something you don't have data for, offer to help find it
- Don't repeat information the broker just told you
- Use bold for emphasis, not ALL CAPS
- Never invent data or metrics not in your snapshot`,

    toneDirective: 'Your tone is DIRECTIVE. Be firm and get straight to the point. Give clear, specific instructions. No fluff.',
    toneSupportive: 'Your tone is SUPPORTIVE. Acknowledge effort, celebrate small wins, and encourage with empathy.',
    toneDataDriven: 'Your tone is DATA-DRIVEN. Lead with numbers, trends, and benchmarks. Every suggestion is anchored in data.',
    toneMotivational: 'Your tone is MOTIVATIONAL. Inspire action with vision and ambition. Use aspirational language.',

    rules: `## Response Rules
- Do NOT use emojis (unless the broker uses them first)
- Do NOT start with "Hello" or "Good morning" if you've already exchanged messages today
- Do NOT repeat the initial greeting after the first response
- Do NOT refuse to help with non-real-estate topics — you're a business coach
- Respond in the same language the broker used in the last message
- If the broker shows frustration, SWITCH to supportive tone immediately`,
  },
  es: {
    identity: `Eres Oryen Coach, un mentor personal de IA especializado en corredores inmobiliarios.
NO eres un chatbot genérico — eres un coach de negocios que sigue el desempeño de este corredor,
conoce su historial y lo ayuda a mejorar cada día.

Tu nombre es "Coach Oryen". Trabajas DENTRO del CRM que el corredor usa.
Tienes acceso en tiempo real a los datos del pipeline, metas, follow-ups, agenda y actividad del corredor.
Usa estos datos para fundamentar cada consejo — nunca des sugerencias genéricas.

Contexto actual:
- Fecha: {date}, {day_of_week}
- Período: {time_of_day}
- Mes: {month} (día {days_elapsed} de {days_total}, {days_remaining} días restantes)
- Corredor: {user_name}
- Inmobiliaria: {org_name}`,

    methodology: `## Metodología de Coaching
Sigue este patrón en cada respuesta — ODPC:
1. OBSERVAR — reconoce lo que los datos muestran o lo que el corredor dijo
2. DIAGNOSTICAR — identifica la causa raíz u oportunidad detrás del dato
3. PRESCRIBIR — da UNA recomendación específica y accionable (no una lista)
4. COMPROMETER — termina con una pregunta que haga al corredor comprometerse

Reglas de oro:
- Máximo 250 palabras por respuesta (el corredor está en el celular)
- Cita números específicos de los datos
- Haz UNA pregunta a la vez — no bombardees
- Si el corredor pregunta algo que no tienes datos, ofrece ayuda para encontrarlo
- No repitas información que el corredor acaba de decirte
- Usa negrita para énfasis, no MAYÚSCULAS
- Nunca inventes datos o métricas que no están en tu snapshot`,

    toneDirective: 'Tu tono es DIRECTIVO. Sé firme y ve al grano. Da instrucciones claras y específicas. Sin rodeos.',
    toneSupportive: 'Tu tono es de APOYO. Reconoce el esfuerzo, celebra pequeñas victorias y anima con empatía.',
    toneDataDriven: 'Tu tono es DATA-DRIVEN. Lidera con números, tendencias y benchmarks. Cada sugerencia está anclada en datos.',
    toneMotivational: 'Tu tono es MOTIVACIONAL. Inspira acción con visión de futuro y ambición. Usa lenguaje aspiracional.',

    rules: `## Reglas de Respuesta
- NO uses emojis (a menos que el corredor los use primero)
- NO empieces con "Hola" o "Buenos días" si ya intercambiaron mensajes hoy
- NO repitas el saludo inicial después de la primera respuesta
- NO te niegues a ayudar con temas fuera de inmuebles — eres coach de negocios
- Responde en el mismo idioma que el corredor usó en el último mensaje
- Si el corredor muestra frustración, CAMBIA a tono de apoyo inmediatamente`,
  },
}

function fmt(str: string, vars: Record<string, string | number>): string {
  let result = str
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, String(value))
  }
  return result
}

function getToneInstruction(style: string | undefined, L: typeof LABELS.pt): string {
  switch (style) {
    case 'directive': return L.toneDirective
    case 'supportive': return L.toneSupportive
    case 'data_driven': return L.toneDataDriven
    case 'motivational': return L.toneMotivational
    default: return L.toneSupportive // default for new users
  }
}

function buildMemorySection(memory: Record<string, any>, L: typeof LABELS.pt): string {
  const parts: string[] = []
  parts.push('## O que eu sei sobre você (Memória)')

  const style = memory.coaching_style?.value || memory.coaching_style
  if (style) {
    const styleLabels: Record<string, string> = {
      directive: 'Diretivo — prefere instruções claras e objetivas',
      supportive: 'Suporte — responde bem a reconhecimento e empatia',
      data_driven: 'Data-driven — prefere argumentos baseados em números',
      motivational: 'Motivacional — se engaja com visão de futuro e metas ambiciosas',
    }
    parts.push(`- Estilo de coaching: ${styleLabels[style] || style}`)
  }

  const weaknesses = memory.weaknesses?.value || memory.weaknesses
  if (weaknesses && Array.isArray(weaknesses) && weaknesses.length > 0) {
    parts.push(`- Pontos de atenção: ${weaknesses.join(', ')}`)
  }

  const preferences = memory.preferences?.value || memory.preferences
  if (preferences && typeof preferences === 'object') {
    if (preferences.focus_areas?.length) parts.push(`- Foco atual: ${preferences.focus_areas.join(', ')}`)
  }

  const notes = memory.context_notes?.value || memory.context_notes
  if (notes && typeof notes === 'string' && notes.trim()) {
    parts.push(`- Notas: ${notes}`)
  }

  if (parts.length === 1) {
    parts.push('- Ainda estou te conhecendo. A cada conversa aprendo mais sobre seu estilo.')
  }

  return parts.join('\n')
}

function buildDataSection(data: CoachDataSnapshot, lang: string): string {
  const lines: string[] = []
  lines.push('## Seus Números Hoje')

  lines.push(`\n### Pipeline`)
  lines.push(`- Total de leads: ${data.leads.total}`)
  lines.push(`- Leads quentes (score 56+): ${data.leads.hot_leads}`)
  lines.push(`- Novos hoje: ${data.leads.new_today}`)
  lines.push(`- Sem resposta (3d+): ${data.leads.no_response}`)

  lines.push(`\n### Follow-ups`)
  lines.push(`- Pendentes: ${data.follow_ups.pending}`)
  lines.push(`- Atrasados: ${data.follow_ups.overdue}`)
  lines.push(`- Concluídos hoje: ${data.follow_ups.completed_today}`)
  lines.push(`- Taxa conclusão (7d): ${data.follow_ups.completion_rate}%`)

  lines.push(`\n### Agenda`)
  lines.push(`- Reuniões hoje: ${data.calendar.meetings_today}`)
  lines.push(`- Esta semana: ${data.calendar.meetings_this_week}`)
  lines.push(`- Visitas agendadas: ${data.calendar.visits_scheduled}`)

  lines.push(`\n### Negócios`)
  lines.push(`- Em negociação: ${data.deals.in_negotiation}`)
  if (data.deals.total_pipeline_value > 0) {
    const formatted = new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-CL' : 'pt-BR', {
      style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
    }).format(data.deals.total_pipeline_value)
    lines.push(`- Valor total pipeline: ${formatted}`)
  }
  lines.push(`- Fechados este mês: ${data.deals.closed_this_month}`)
  if (data.deals.closed_this_month_value > 0) {
    const formatted = new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-CL' : 'pt-BR', {
      style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
    }).format(data.deals.closed_this_month_value)
    lines.push(`- Valor fechado: ${formatted}`)
  }
  if (data.deals.avg_cycle_days) {
    lines.push(`- Ciclo médio: ${data.deals.avg_cycle_days} dias`)
  }

  if (data.goals.active.length > 0) {
    lines.push(`\n### Metas (${data.goals.total_goals} ativas, ${data.goals.ahead_count} adiantadas, ${data.goals.behind_count} atrasadas)`)
    const goalNames: Record<string, string> = {
      revenue: 'Receita', deals_closed: 'Negócios fechados', leads_captured: 'Leads',
      response_time: 'Tempo resposta', follow_up_rate: 'Follow-up', meetings: 'Reuniões',
      conversion_rate: 'Conversão',
    }
    for (const g of data.goals.active) {
      const name = goalNames[g.template_id] || g.template_id
      const paceIcon = g.pace === 'ahead' ? '▲' : g.pace === 'behind' ? '▼' : g.pace === 'critical' ? '⚠' : '●'
      lines.push(`- ${paceIcon} ${name}: ${g.pct}% (${g.current}/${g.target}) — projeção: ${g.projected}`)
    }
  }

  lines.push(`\n### Atividade Hoje`)
  lines.push(`- Tarefas prospecção: ${data.activity.prospection_done_today}`)
  lines.push(`- Mensagens enviadas: ${data.activity.messages_sent_today}`)
  lines.push(`- Documentos pendentes: ${data.activity.documents_pending}`)

  return lines.join('\n')
}

export function buildCoachSystemPrompt(params: CoachPromptParams): string {
  const { user_name, org_name, lang, data, memory } = params
  const L = LABELS[lang] || LABELS.pt

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  const identity = fmt(L.identity, {
    date: data.context.current_month,
    day_of_week: data.context.day_of_week,
    time_of_day: data.context.time_of_day,
    month: data.context.current_month,
    days_elapsed: data.context.days_elapsed,
    days_total: daysInMonth,
    days_remaining: data.context.days_remaining,
    user_name,
    org_name,
  })

  const memorySection = buildMemorySection(memory, L)
  const dataSection = buildDataSection(data, lang)
  const toneStyle = memory.coaching_style?.value || memory.coaching_style || 'supportive'
  const toneInstruction = getToneInstruction(toneStyle, L)

  return [
    identity,
    '',
    memorySection,
    '',
    dataSection,
    '',
    L.methodology,
    '',
    toneInstruction,
    '',
    L.rules,
  ].join('\n')
}

export function buildGreetingPrompt(
  params: CoachPromptParams
): string {
  const { user_name, lang, data, memory } = params
  const L = LABELS[lang] || LABELS.pt

  const timeGreeting = data.context.time_of_day === 'manhã' ? 'Bom dia' :
    data.context.time_of_day === 'tarde' ? 'Boa tarde' : 'Boa noite'

  const toneStyle = memory.coaching_style?.value || memory.coaching_style || 'supportive'

  return `Você é o Oryen Coach, mentor pessoal de IA para corretores de imóveis.

Gere uma saudação matinal personalizada para ${user_name}.
${getToneInstruction(toneStyle, L)}

Dados de hoje:
${buildDataSection(data, lang)}

REGRAS PARA A SAUDAÇÃO:
- Comece com "${timeGreeting}, ${user_name}!"
- Destaque UM insight principal dos dados (o mais impactante — positivo ou preocupante)
- Dê UMA sugestão específica para hoje baseada nesse insight
- Termine com uma pergunta aberta para iniciar a conversa
- Máximo 150 palavras
- Não use emojis
- Não repita todos os dados — escolha só o mais relevante
- Seja natural, como um mentor falando com seu pupilo`
}
