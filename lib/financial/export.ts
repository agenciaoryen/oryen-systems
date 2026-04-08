// lib/financial/export.ts
// PDF (html2pdf.js) and CSV export utilities

import type { MonthlyPLData, BrokerRevenue, CategoryExpense } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function exportToCSV(
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  filename: string
) {
  if (data.length === 0) return

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const header = columns.map(c => `"${c.label}"`).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key]
      if (val === null || val === undefined) return '""'
      if (typeof val === 'number') return String(val)
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )

  const csv = BOM + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT (via html2pdf.js)
// ═══════════════════════════════════════════════════════════════════════════════

async function generatePDF(htmlContent: string, filename: string) {
  // @ts-ignore — html2pdf.js is a UMD module
  const html2pdf = (await import('html2pdf.js')).default

  const container = document.createElement('div')
  container.innerHTML = htmlContent
  container.style.padding = '20px'
  container.style.fontFamily = 'Inter, sans-serif'
  container.style.color = '#1a1a1a'
  container.style.fontSize = '12px'
  document.body.appendChild(container)

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `${filename}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save()

  document.body.removeChild(container)
}

function formatCurrencySimple(value: number, currency: string): string {
  const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// P&L REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function generatePLReportPDF(
  data: MonthlyPLData[],
  orgName: string,
  currency: string,
  lang: string
) {
  const title = lang === 'pt' ? 'Relatório P&L' : lang === 'es' ? 'Reporte P&L' : 'P&L Report'
  const headers = lang === 'pt'
    ? ['Mês', 'Receita', 'Despesas', 'Lucro Líquido']
    : lang === 'es'
    ? ['Mes', 'Ingresos', 'Gastos', 'Beneficio Neto']
    : ['Month', 'Revenue', 'Expenses', 'Net Profit']

  const fmt = (v: number) => formatCurrencySimple(v, currency)

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0)
  const totalProfit = totalRevenue - totalExpenses

  const rows = data.map(d => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.month}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#10b981">${fmt(d.revenue)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#ef4444">${fmt(d.expenses)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${d.netProfit >= 0 ? '#10b981' : '#ef4444'}">${fmt(d.netProfit)}</td>
    </tr>
  `).join('')

  const html = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:20px;font-weight:700;margin:0">${title}</h1>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${orgName} — ${new Date().toLocaleDateString()}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:#f5f5f5">
          ${headers.map(h => `<th style="padding:8px;text-align:${h === headers[0] ? 'left' : 'right'};font-size:11px;text-transform:uppercase;color:#666">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #333;font-weight:700">
          <td style="padding:10px">Total</td>
          <td style="padding:10px;text-align:right;color:#10b981">${fmt(totalRevenue)}</td>
          <td style="padding:10px;text-align:right;color:#ef4444">${fmt(totalExpenses)}</td>
          <td style="padding:10px;text-align:right;color:${totalProfit >= 0 ? '#10b981' : '#ef4444'}">${fmt(totalProfit)}</td>
        </tr>
      </tfoot>
    </table>
  `

  await generatePDF(html, `pl-report-${orgName.toLowerCase().replace(/\s+/g, '-')}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateCommissionReportPDF(
  brokers: BrokerRevenue[],
  orgName: string,
  currency: string,
  lang: string
) {
  const title = lang === 'pt' ? 'Relatório de Comissões' : lang === 'es' ? 'Reporte de Comisiones' : 'Commission Report'
  const headers = lang === 'pt'
    ? ['Corretor', 'Receita', 'Negócios', 'Comissão Total']
    : lang === 'es'
    ? ['Corredor', 'Ingresos', 'Negocios', 'Comisión Total']
    : ['Broker', 'Revenue', 'Deals', 'Total Commission']

  const fmt = (v: number) => formatCurrencySimple(v, currency)

  const rows = brokers.map(b => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${b.broker_name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(b.revenue)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${b.deals_count}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#6366f1">${fmt(b.commission_total)}</td>
    </tr>
  `).join('')

  const html = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:20px;font-weight:700;margin:0">${title}</h1>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${orgName} — ${new Date().toLocaleDateString()}</p>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f5f5f5">
          ${headers.map((h, i) => `<th style="padding:8px;text-align:${i === 0 ? 'left' : i === 2 ? 'center' : 'right'};font-size:11px;text-transform:uppercase;color:#666">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `

  await generatePDF(html, `commission-report-${orgName.toLowerCase().replace(/\s+/g, '-')}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSE REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateExpenseReportPDF(
  categories: CategoryExpense[],
  orgName: string,
  currency: string,
  lang: string
) {
  const title = lang === 'pt' ? 'Relatório de Despesas' : lang === 'es' ? 'Reporte de Gastos' : 'Expense Report'
  const headers = lang === 'pt'
    ? ['Categoria', 'Valor', 'Transações', '%']
    : lang === 'es'
    ? ['Categoría', 'Valor', 'Transacciones', '%']
    : ['Category', 'Amount', 'Transactions', '%']

  const fmt = (v: number) => formatCurrencySimple(v, currency)
  const total = categories.reduce((s, c) => s + c.amount, 0)

  const rows = categories.map(c => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${c.category}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(c.amount)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${c.count}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${c.percentage.toFixed(1)}%</td>
    </tr>
  `).join('')

  const html = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:20px;font-weight:700;margin:0">${title}</h1>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${orgName} — ${new Date().toLocaleDateString()}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:#f5f5f5">
          ${headers.map((h, i) => `<th style="padding:8px;text-align:${i === 0 ? 'left' : i === 2 ? 'center' : 'right'};font-size:11px;text-transform:uppercase;color:#666">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #333;font-weight:700">
          <td style="padding:10px">Total</td>
          <td style="padding:10px;text-align:right">${fmt(total)}</td>
          <td style="padding:10px;text-align:center">${categories.reduce((s, c) => s + c.count, 0)}</td>
          <td style="padding:10px;text-align:right">100%</td>
        </tr>
      </tfoot>
    </table>
  `

  await generatePDF(html, `expense-report-${orgName.toLowerCase().replace(/\s+/g, '-')}`)
}
