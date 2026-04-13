// app/dashboard/crm/components/CsvImport.tsx
// Import de leads via CSV/Excel

'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  orgId: string
  defaultStage: string
  onClose: () => void
  onSuccess: (count: number) => void
  lang?: 'pt' | 'en' | 'es'
}

const T = {
  pt: {
    title: 'Importar Contatos',
    subtitle: 'Importe seus contatos de uma planilha CSV',
    dragDrop: 'Arraste um arquivo CSV aqui',
    or: 'ou',
    browse: 'Selecionar arquivo',
    accepted: 'Aceita arquivos .csv com colunas: nome, email, telefone, empresa',
    template: 'Baixar modelo CSV',
    preview: 'Pr\u00e9-visualiza\u00e7\u00e3o',
    rows: 'linhas encontradas',
    name: 'Nome',
    email: 'Email',
    phone: 'Telefone',
    company: 'Empresa',
    importing: 'Importando...',
    import: 'Importar Contatos',
    cancel: 'Cancelar',
    success: 'contatos importados com sucesso!',
    error: 'Erro ao importar',
    duplicates: 'duplicatas ignoradas (email ou telefone j\u00e1 existente)',
    emptyFile: 'Arquivo vazio ou sem dados v\u00e1lidos',
    invalidFormat: 'Formato inv\u00e1lido. Use um arquivo CSV.',
    nameRequired: 'A coluna "nome" \u00e9 obrigat\u00f3ria',
    andMore: 'e mais',
  },
  en: {
    title: 'Import Contacts',
    subtitle: 'Import your contacts from a CSV spreadsheet',
    dragDrop: 'Drag a CSV file here',
    or: 'or',
    browse: 'Select file',
    accepted: 'Accepts .csv files with columns: name, email, phone, company',
    template: 'Download CSV template',
    preview: 'Preview',
    rows: 'rows found',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    importing: 'Importing...',
    import: 'Import Contacts',
    cancel: 'Cancel',
    success: 'contacts imported successfully!',
    error: 'Import error',
    duplicates: 'duplicates skipped (email or phone already exists)',
    emptyFile: 'Empty file or no valid data',
    invalidFormat: 'Invalid format. Use a CSV file.',
    nameRequired: 'The "name" column is required',
    andMore: 'and more',
  },
  es: {
    title: 'Importar Contactos',
    subtitle: 'Importa tus contactos desde una hoja CSV',
    dragDrop: 'Arrastra un archivo CSV aqu\u00ed',
    or: 'o',
    browse: 'Seleccionar archivo',
    accepted: 'Acepta archivos .csv con columnas: nombre, email, tel\u00e9fono, empresa',
    template: 'Descargar modelo CSV',
    preview: 'Vista previa',
    rows: 'filas encontradas',
    name: 'Nombre',
    email: 'Email',
    phone: 'Tel\u00e9fono',
    company: 'Empresa',
    importing: 'Importando...',
    import: 'Importar Contactos',
    cancel: 'Cancelar',
    success: 'contactos importados con \u00e9xito!',
    error: 'Error al importar',
    duplicates: 'duplicados ignorados (email o tel\u00e9fono ya existente)',
    emptyFile: 'Archivo vac\u00edo o sin datos v\u00e1lidos',
    invalidFormat: 'Formato inv\u00e1lido. Usa un archivo CSV.',
    nameRequired: 'La columna "nombre" es obligatoria',
    andMore: 'y m\u00e1s',
  },
}

interface ParsedRow {
  name: string
  email: string
  phone: string
  company: string
}

// Column name mappings (accepts multiple variations)
const COL_MAP: Record<string, keyof ParsedRow> = {
  nome: 'name', name: 'name', nombre: 'name', 'nome completo': 'name', 'full name': 'name',
  email: 'email', 'e-mail': 'email', correo: 'email',
  telefone: 'phone', phone: 'phone', celular: 'phone', whatsapp: 'phone', tel: 'phone', 'tel\u00e9fono': 'phone',
  empresa: 'company', company: 'company', 'nome da empresa': 'company', 'company name': 'company', 'nombre empresa': 'company',
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Detect separator (, or ;)
  const sep = lines[0].includes(';') ? ';' : ','

  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
  const colIndexes: Partial<Record<keyof ParsedRow, number>> = {}

  headers.forEach((h, i) => {
    const mapped = COL_MAP[h]
    if (mapped && colIndexes[mapped] === undefined) {
      colIndexes[mapped] = i
    }
  })

  // Must have at least name column
  if (colIndexes.name === undefined) return []

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))
    const name = cols[colIndexes.name!] || ''
    if (!name) continue

    rows.push({
      name,
      email: colIndexes.email !== undefined ? cols[colIndexes.email] || '' : '',
      phone: colIndexes.phone !== undefined ? cols[colIndexes.phone] || '' : '',
      company: colIndexes.company !== undefined ? cols[colIndexes.company] || '' : '',
    })
  }

  return rows
}

function downloadTemplate() {
  const csv = 'nome,email,telefone,empresa\nJoao Silva,joao@email.com,5511999999999,Imobiliaria ABC\nMaria Santos,maria@email.com,5521888888888,Construtora XYZ\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_leads.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function CsvImport({ orgId, defaultStage, onClose, onSuccess, lang = 'pt' }: Props) {
  const t = T[lang] || T.pt
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    setError('')
    setResult(null)

    if (!file.name.endsWith('.csv')) {
      setError(t.invalidFormat)
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError(parsed.length === 0 && text.includes(',') ? t.nameRequired : t.emptyFile)
        return
      }
      setRows(parsed)
    }
    reader.readAsText(file, 'UTF-8')
  }, [t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = async () => {
    if (rows.length === 0 || !orgId) return
    setImporting(true)
    setError('')

    try {
      // Get existing emails and phones to detect duplicates
      const { data: existing } = await supabase
        .from('leads')
        .select('email, phone')
        .eq('org_id', orgId)

      const existingEmails = new Set((existing || []).map(l => l.email?.toLowerCase()).filter(Boolean))
      const existingPhones = new Set((existing || []).map(l => l.phone?.replace(/\D/g, '')).filter(Boolean))

      const toInsert: any[] = []
      let duplicates = 0

      for (const row of rows) {
        const emailLower = row.email?.toLowerCase()
        const phoneClean = row.phone?.replace(/\D/g, '')

        // Skip if email or phone already exists
        if ((emailLower && existingEmails.has(emailLower)) ||
            (phoneClean && existingPhones.has(phoneClean))) {
          duplicates++
          continue
        }

        toInsert.push({
          org_id: orgId,
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          nome_empresa: row.company || null,
          stage: defaultStage,
          source: 'csv_import',
        })

        // Track new entries to avoid duplicates within the CSV itself
        if (emailLower) existingEmails.add(emailLower)
        if (phoneClean) existingPhones.add(phoneClean)
      }

      if (toInsert.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < toInsert.length; i += 100) {
          const batch = toInsert.slice(i, i + 100)
          const { error: insertError } = await supabase.from('leads').insert(batch)
          if (insertError) throw insertError
        }
      }

      setResult({ imported: toInsert.length, duplicates })
      if (toInsert.length > 0) {
        setTimeout(() => onSuccess(toInsert.length), 1500)
      }
    } catch (err: any) {
      setError(`${t.error}: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const previewRows = rows.slice(0, 5)
  const hasMore = rows.length > 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }}>
      <div className="w-full max-w-lg mx-4 rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(90,122,230,0.1)' }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h2>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Result message */}
        {result && (
          <div className="flex items-start gap-2.5 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'rgb(16,185,129)' }} />
            <div>
              <span className="text-sm font-medium" style={{ color: 'rgb(16,185,129)' }}>
                {result.imported} {t.success}
              </span>
              {result.duplicates > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {result.duplicates} {t.duplicates}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-error)' }} />
            <span className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</span>
          </div>
        )}

        {/* Upload area */}
        {rows.length === 0 && !result && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: dragOver ? 'rgba(90,122,230,0.05)' : 'transparent',
              }}
            >
              <Upload size={32} style={{ color: 'var(--color-text-tertiary)' }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.dragDrop}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.or}</p>
                <span className="inline-block mt-2 px-4 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                  {t.browse}
                </span>
              </div>
              <p className="text-[11px] text-center" style={{ color: 'var(--color-text-tertiary)' }}>{t.accepted}</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {/* Download template */}
            <button
              onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
              className="flex items-center gap-2 mt-3 text-xs font-medium transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              <Download size={14} />
              {t.template}
            </button>
          </>
        )}

        {/* Preview table */}
        {rows.length > 0 && !result && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {t.preview} — {rows.length} {t.rows}
              </p>
              <button
                onClick={() => { setRows([]); setFileName('') }}
                className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                {t.cancel}
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg mb-4" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--color-bg-hover)' }}>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.name}</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.email}</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.phone}</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.company}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>{row.name}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.email || '-'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.phone || '-'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.company || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && (
                <p className="text-center py-2 text-[11px]" style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border)' }}>
                  {t.andMore} {rows.length - 5}...
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: 'var(--gradient-brand)', color: '#fff' }}
            >
              {importing ? (
                <><Loader2 size={16} className="animate-spin" /> {t.importing}</>
              ) : (
                <><Upload size={16} /> {t.import} ({rows.length})</>
              )}
            </button>
          </>
        )}

        {/* Footer actions */}
        {(rows.length === 0 || result) && (
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {result ? 'Fechar' : t.cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
