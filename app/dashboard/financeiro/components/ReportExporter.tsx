'use client'

import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import type { MonthlyPLData, BrokerRevenue, CategoryExpense } from '@/lib/financial/types'
import { exportToCSV, generatePLReportPDF, generateCommissionReportPDF, generateExpenseReportPDF } from '@/lib/financial/export'

const TRANSLATIONS = {
  pt: {
    title: 'Relatórios',
    subtitle: 'Exporte seus dados financeiros em PDF ou CSV',
    plReport: 'Relatório P&L',
    plDesc: 'Receitas, despesas e lucro líquido mensal',
    commReport: 'Relatório de Comissões',
    commDesc: 'Comissões por corretor e negócio',
    expReport: 'Relatório de Despesas',
    expDesc: 'Despesas agrupadas por categoria',
    pdf: 'PDF',
    csv: 'CSV',
    generating: 'Gerando...',
    noData: 'Sem dados para exportar',
  },
  en: {
    title: 'Reports',
    subtitle: 'Export your financial data as PDF or CSV',
    plReport: 'P&L Report',
    plDesc: 'Monthly revenue, expenses, and net profit',
    commReport: 'Commission Report',
    commDesc: 'Commissions by broker and deal',
    expReport: 'Expense Report',
    expDesc: 'Expenses grouped by category',
    pdf: 'PDF',
    csv: 'CSV',
    generating: 'Generating...',
    noData: 'No data to export',
  },
  es: {
    title: 'Reportes',
    subtitle: 'Exporte sus datos financieros en PDF o CSV',
    plReport: 'Reporte P&L',
    plDesc: 'Ingresos, gastos y beneficio neto mensual',
    commReport: 'Reporte de Comisiones',
    commDesc: 'Comisiones por corredor y negocio',
    expReport: 'Reporte de Gastos',
    expDesc: 'Gastos agrupados por categoría',
    pdf: 'PDF',
    csv: 'CSV',
    generating: 'Generando...',
    noData: 'Sin datos para exportar',
  },
}

type Lang = keyof typeof TRANSLATIONS

interface Props {
  orgId: string
  orgName: string
  monthlyPL: MonthlyPLData[]
  brokerRevenue: BrokerRevenue[]
  expensesByCategory: CategoryExpense[]
  currency: string
  lang: Lang
}

export default function ReportExporter({
  orgId, orgName, monthlyPL, brokerRevenue, expensesByCategory, currency, lang
}: Props) {
  const t = TRANSLATIONS[lang]
  const [generating, setGenerating] = useState<string | null>(null)

  const handleExport = async (type: string, format: 'pdf' | 'csv') => {
    setGenerating(`${type}-${format}`)

    try {
      if (type === 'pl') {
        if (format === 'pdf') {
          await generatePLReportPDF(monthlyPL, orgName, currency, lang)
        } else {
          exportToCSV(
            monthlyPL,
            [
              { key: 'month', label: lang === 'pt' ? 'Mês' : 'Month' },
              { key: 'revenue', label: lang === 'pt' ? 'Receita' : 'Revenue' },
              { key: 'expenses', label: lang === 'pt' ? 'Despesas' : 'Expenses' },
              { key: 'netProfit', label: lang === 'pt' ? 'Lucro Líquido' : 'Net Profit' },
            ],
            `pl-${orgName.toLowerCase().replace(/\s+/g, '-')}`
          )
        }
      } else if (type === 'comm') {
        if (format === 'pdf') {
          await generateCommissionReportPDF(brokerRevenue, orgName, currency, lang)
        } else {
          exportToCSV(
            brokerRevenue,
            [
              { key: 'broker_name', label: lang === 'pt' ? 'Corretor' : 'Broker' },
              { key: 'revenue', label: lang === 'pt' ? 'Receita' : 'Revenue' },
              { key: 'deals_count', label: lang === 'pt' ? 'Negócios' : 'Deals' },
              { key: 'commission_total', label: lang === 'pt' ? 'Comissão' : 'Commission' },
            ],
            `commissions-${orgName.toLowerCase().replace(/\s+/g, '-')}`
          )
        }
      } else if (type === 'exp') {
        if (format === 'pdf') {
          await generateExpenseReportPDF(expensesByCategory, orgName, currency, lang)
        } else {
          exportToCSV(
            expensesByCategory,
            [
              { key: 'category', label: lang === 'pt' ? 'Categoria' : 'Category' },
              { key: 'amount', label: lang === 'pt' ? 'Valor' : 'Amount' },
              { key: 'count', label: lang === 'pt' ? 'Transacoes' : 'Transactions' },
              { key: 'percentage', label: '%' },
            ],
            `expenses-${orgName.toLowerCase().replace(/\s+/g, '-')}`
          )
        }
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setGenerating(null)
    }
  }

  const reports = [
    { key: 'pl', title: t.plReport, desc: t.plDesc, hasData: monthlyPL.length > 0, icon: '📊' },
    { key: 'comm', title: t.commReport, desc: t.commDesc, hasData: brokerRevenue.length > 0, icon: '💰' },
    { key: 'exp', title: t.expReport, desc: t.expDesc, hasData: expensesByCategory.length > 0, icon: '📋' },
  ]

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <FileText size={20} style={{ color: 'var(--color-primary)' }} />
          {t.title}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
      </div>

      {reports.map((report) => (
        <div
          key={report.key}
          className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{report.icon}</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{report.title}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{report.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report.hasData ? (
              <>
                <button
                  onClick={() => handleExport(report.key, 'pdf')}
                  disabled={generating !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', color: 'white' }}
                >
                  {generating === `${report.key}-pdf` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  {generating === `${report.key}-pdf` ? t.generating : t.pdf}
                </button>
                <button
                  onClick={() => handleExport(report.key, 'csv')}
                  disabled={generating !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  {generating === `${report.key}-csv` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  {generating === `${report.key}-csv` ? t.generating : t.csv}
                </button>
              </>
            ) : (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.noData}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
