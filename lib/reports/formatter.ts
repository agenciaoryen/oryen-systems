// lib/reports/formatter.ts
// Formata ReportData em mensagem de texto para WhatsApp

import { ReportData } from './aggregator'

function formatCurrency(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    BRL: 'R$',
    USD: 'US$',
    EUR: '€',
    CLP: 'CLP$',
    COP: 'COP$',
    MXN: 'MX$',
    GBP: '£',
  }
  const symbol = symbols[currency] || currency
  return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function progressBar(current: number, target: number): string {
  const pct = target > 0 ? Math.min(current / target, 1) : 0
  const filled = Math.round(pct * 10)
  const empty = 10 - filled
  return '▓'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(pct * 100)}%`
}

export function formatReportMessage(data: ReportData): string {
  const lines: string[] = []
  const currency = data.currency || 'BRL'

  // ═══ HEADER ═══
  lines.push(`📊 *${data.reportName}*`)
  lines.push(`🏢 ${data.orgName}`)
  lines.push(`📅 ${data.period}`)
  lines.push(`⏰ Gerado em ${data.generatedAt}`)
  lines.push('')

  // ═══ MÉTRICAS OPERACIONAIS ═══
  const hasOperational = data.leads_captados !== undefined ||
    data.mensagens_enviadas !== undefined ||
    data.ligacoes_feitas !== undefined ||
    data.leads_responderam !== undefined

  if (hasOperational) {
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('📋 *OPERACIONAL*')
    lines.push('')

    if (data.leads_captados !== undefined) {
      lines.push(`👥 Contatos recebidos: *${data.leads_captados}*`)
    }
    if (data.mensagens_enviadas !== undefined) {
      lines.push(`💬 Mensagens enviadas: *${data.mensagens_enviadas}*`)
    }
    if (data.ligacoes_feitas !== undefined) {
      lines.push(`📞 Ligações feitas: *${data.ligacoes_feitas}*`)
    }
    if (data.leads_responderam !== undefined) {
      lines.push(`✅ Contatos que responderam: *${data.leads_responderam}*`)
    }
    lines.push('')
  }

  // ═══ CANAIS DE ORIGEM ═══
  if (data.canais_origem && data.canais_origem.length > 0) {
    lines.push('📡 *Canais de Origem:*')
    data.canais_origem.forEach(c => {
      lines.push(`   • ${c.name}: ${c.count}`)
    })
    lines.push('')
  }

  // ═══ PIPELINE ═══
  if (data.pipeline && data.pipeline.length > 0) {
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('🔄 *PIPELINE*')
    lines.push('')
    const total = data.pipeline.reduce((s, p) => s + p.count, 0)
    data.pipeline.forEach(stage => {
      const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0
      lines.push(`   ${stage.label}: *${stage.count}* (${pct}%)`)
    })
    lines.push(`   📊 Total: *${total}*`)
    lines.push('')
  }

  // ═══ FINANCEIRO ═══
  const hasFinancial = data.receita_total !== undefined ||
    data.despesas_total !== undefined ||
    data.lucro_liquido !== undefined ||
    data.comissoes_pendentes !== undefined ||
    data.negocios_fechados !== undefined ||
    data.ticket_medio !== undefined

  if (hasFinancial) {
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('💰 *FINANCEIRO*')
    lines.push('')

    if (data.receita_total !== undefined) {
      lines.push(`   📈 Receita: *${formatCurrency(data.receita_total, currency)}*`)
    }
    if (data.despesas_total !== undefined) {
      lines.push(`   📉 Despesas: *${formatCurrency(data.despesas_total, currency)}*`)
    }
    if (data.lucro_liquido !== undefined) {
      const icon = data.lucro_liquido >= 0 ? '✅' : '🔴'
      lines.push(`   ${icon} Lucro Líquido: *${formatCurrency(data.lucro_liquido, currency)}*`)
    }
    if (data.negocios_fechados !== undefined) {
      lines.push(`   🤝 Negócios fechados: *${data.negocios_fechados}*`)
    }
    if (data.ticket_medio !== undefined) {
      lines.push(`   🎯 Ticket médio: *${formatCurrency(data.ticket_medio, currency)}*`)
    }
    if (data.comissoes_pendentes !== undefined) {
      lines.push(`   💼 Comissões pendentes: *${formatCurrency(data.comissoes_pendentes, currency)}*`)
    }
    lines.push('')
  }

  // ═══ SITE ═══
  const hasSite = data.site_views !== undefined ||
    data.site_leads !== undefined ||
    data.site_conversion !== undefined

  if (hasSite) {
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('🌐 *SITE*')
    lines.push('')

    if (data.site_views !== undefined) {
      lines.push(`   👁️ Visualizações: *${data.site_views}*`)
    }
    if (data.site_leads !== undefined) {
      lines.push(`   📩 Leads do site: *${data.site_leads}*`)
    }
    if (data.site_conversion !== undefined) {
      lines.push(`   📊 Taxa de conversão: *${data.site_conversion}%*`)
    }
    lines.push('')
  }

  // ═══ META PRINCIPAL ═══
  if (data.meta_principal_nome) {
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('🎯 *META PRINCIPAL*')
    lines.push('')
    lines.push(`   ${data.meta_principal_nome}`)
    lines.push(`   ${progressBar(data.meta_principal_progresso || 0, data.meta_principal_target || 1)}`)
    lines.push(`   ${data.meta_principal_progresso || 0} / ${data.meta_principal_target || 0}`)
    lines.push('')
  }

  // ═══ FOLLOW-UP ═══
  const hasFollowup = data.followup_pendentes !== undefined ||
    data.followup_responderam !== undefined ||
    data.followup_esgotados !== undefined

  if (hasFollowup) {
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('🔁 *FOLLOW-UP*')
    lines.push('')

    if (data.followup_pendentes !== undefined) {
      lines.push(`   ⏳ Pendentes/ativos: *${data.followup_pendentes}*`)
    }
    if (data.followup_responderam !== undefined) {
      lines.push(`   ✅ Responderam: *${data.followup_responderam}*`)
    }
    if (data.followup_esgotados !== undefined) {
      lines.push(`   ❌ Esgotados: *${data.followup_esgotados}*`)
    }
    lines.push('')
  }

  // ═══ FOOTER ═══
  lines.push('━━━━━━━━━━━━━━━━━━')
  lines.push('_Relatório gerado automaticamente por Oryen AI_')

  return lines.join('\n')
}
