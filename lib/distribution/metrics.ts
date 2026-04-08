// lib/distribution/metrics.ts
// Métricas de workload e performance dos corretores

import { createClient } from '@supabase/supabase-js'
import type { WorkloadStats } from './types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// ATUALIZAR MÉTRICAS CACHED (chamado pelo cron)
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateBrokerMetrics(orgId: string): Promise<void> {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'vendedor'])

  if (!users || users.length === 0) return

  for (const user of users) {
    // Contar leads ativos
    const { count: activeCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .not('stage', 'in', '("won","lost","perdido","ganho")')

    // Taxa de conversão (won / total atribuídos nos últimos 90 dias)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count: totalAssigned } = await supabase
      .from('lead_assignment_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .gte('created_at', ninetyDaysAgo.toISOString())

    const { count: wonCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .in('stage', ['won', 'ganho'])
      .gte('updated_at', ninetyDaysAgo.toISOString())

    const conversionRate = (totalAssigned && totalAssigned > 0)
      ? ((wonCount || 0) / totalAssigned) * 100
      : 0

    // Tempo médio de resposta (assigned_at → first_response_at)
    const { data: responseTimes } = await supabase
      .from('leads')
      .select('assigned_at, first_response_at')
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .not('first_response_at', 'is', null)
      .not('assigned_at', 'is', null)
      .gte('assigned_at', ninetyDaysAgo.toISOString())
      .limit(100)

    let avgResponseMin: number | null = null
    if (responseTimes && responseTimes.length > 0) {
      const totalMin = responseTimes.reduce((sum, l) => {
        const diff = new Date(l.first_response_at).getTime() - new Date(l.assigned_at).getTime()
        return sum + (diff / (1000 * 60))
      }, 0)
      avgResponseMin = Math.round(totalMin / responseTimes.length)
    }

    // Upsert broker_config
    await supabase
      .from('broker_config')
      .upsert({
        user_id: user.id,
        org_id: orgId,
        active_lead_count: activeCount || 0,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        avg_response_time_min: avgResponseMin,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,org_id',
      })
  }

  console.log(`[Metrics] ✓ Métricas atualizadas para ${users.length} corretores — org ${orgId}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKLOAD STATS (para dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTeamWorkload(orgId: string): Promise<WorkloadStats[]> {
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, role, status')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'vendedor'])

  if (!users || users.length === 0) return []

  const { data: brokerConfigs } = await supabase
    .from('broker_config')
    .select('*')
    .eq('org_id', orgId)

  const configMap = new Map((brokerConfigs || []).map(bc => [bc.user_id, bc]))

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const stats: WorkloadStats[] = []

  for (const user of users) {
    const bc = configMap.get(user.id)

    // Leads ativos por estágio
    const { data: leads } = await supabase
      .from('leads')
      .select('stage')
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .not('stage', 'in', '("won","lost","perdido","ganho")')

    const leadsByStage: Record<string, number> = {}
    let activeLeads = 0
    if (leads) {
      activeLeads = leads.length
      for (const l of leads) {
        const stage = l.stage || 'unknown'
        leadsByStage[stage] = (leadsByStage[stage] || 0) + 1
      }
    }

    // Leads recebidos esta semana
    const { count: weekCount } = await supabase
      .from('lead_assignment_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .gte('created_at', weekAgo.toISOString())

    // Leads recebidos este mês
    const { count: monthCount } = await supabase
      .from('lead_assignment_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .gte('created_at', monthAgo.toISOString())

    stats.push({
      userId: user.id,
      userName: user.full_name || 'Corretor',
      role: user.role,
      isAvailable: bc?.is_available ?? true,
      activeLeads,
      leadsThisWeek: weekCount || 0,
      leadsThisMonth: monthCount || 0,
      conversionRate: bc?.conversion_rate ? Number(bc.conversion_rate) : 0,
      avgResponseTimeMin: bc?.avg_response_time_min ?? null,
      leadsByStage,
    })
  }

  return stats
}
