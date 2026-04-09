'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { GOAL_COLORS } from '@/lib/goals/constants'
import type { GoalProgress } from '@/lib/goals/types'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

const TRANSLATIONS = {
  pt: {
    title: 'Historico de Metas',
    selectGoal: 'Selecionar meta',
    actual: 'Realizado',
    target: 'Meta',
    noData: 'Sem dados historicos',
    months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  },
  en: {
    title: 'Goals History',
    selectGoal: 'Select goal',
    actual: 'Actual',
    target: 'Target',
    noData: 'No historical data',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  es: {
    title: 'Historico de Metas',
    selectGoal: 'Seleccionar meta',
    actual: 'Realizado',
    target: 'Meta',
    noData: 'Sin datos historicos',
    months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  },
}

type Lang = keyof typeof TRANSLATIONS

interface Props {
  progressList: GoalProgress[]
  month: string
  lang?: Lang
}

export default function HistoricalChart({ progressList, month, lang = 'pt' }: Props) {
  const t = TRANSLATIONS[lang]
  const langKey = `name_${lang}` as 'name_pt' | 'name_en' | 'name_es'

  const [selectedIdx, setSelectedIdx] = useState(0)

  if (!progressList || progressList.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noData}</p>
      </div>
    )
  }

  const options = progressList.map((p, i) => ({
    value: String(i),
    label: p.goal.custom_name || p.template?.[langKey] || p.template?.name_pt || p.goal.template_id,
  }))

  const selected = progressList[selectedIdx]
  if (!selected) return null

  const color = GOAL_COLORS[selected.goal.template_id] || '#6b7280'

  // Build chart data from trend (last 3 months) + current
  const currentMonth = new Date(month)
  const chartData = []

  for (let i = 3; i >= 1; i--) {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - i)
    const monthLabel = t.months[d.getMonth()]
    chartData.push({
      month: monthLabel,
      actual: selected.trend?.[3 - i] || 0,
      target: selected.targetValue,
    })
  }

  chartData.push({
    month: t.months[currentMonth.getMonth()],
    actual: selected.currentValue,
    target: selected.targetValue,
  })

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h2>
        <div className="w-48">
          <CustomSelect
            value={String(selectedIdx)}
            onChange={(val) => setSelectedIdx(Number(val))}
            options={options}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name={t.actual}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
          />
          <ReferenceLine
            y={selected.targetValue}
            stroke="var(--color-text-muted)"
            strokeDasharray="6 4"
            label={{ value: t.target, fill: 'var(--color-text-muted)', fontSize: 11 }}
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
