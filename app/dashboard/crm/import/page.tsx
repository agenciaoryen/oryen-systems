'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Users
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  pt: {
    pageTitle: 'Importar Contatos',
    pageSubtitle: 'Importe seus contatos de uma planilha CSV para o CRM',
    back: 'Voltar ao CRM',
    step1Title: '1. Baixe o modelo',
    step1Desc: 'Use nosso modelo oficial para garantir que os dados sejam importados corretamente. Preencha as colunas com as informações dos seus contatos.',
    downloadTemplate: 'Baixar modelo CSV',
    step2Title: '2. Envie o arquivo preenchido',
    step2Desc: 'Após preencher o modelo, arraste o arquivo aqui ou clique para selecionar.',
    dragDrop: 'Arraste seu arquivo CSV aqui',
    or: 'ou',
    browse: 'Selecionar arquivo',
    accepted: 'Aceita arquivos .csv com colunas: nome, email, telefone',
    columns: 'Colunas aceitas',
    colName: 'Nome (obrigatório)',
    colEmail: 'Email',
    colPhone: 'Telefone / WhatsApp',
    preview: 'Pré-visualização',
    rows: 'contatos encontrados',
    name: 'Nome',
    email: 'Email',
    phone: 'Telefone',
    importing: 'Importando...',
    import: 'Importar Contatos',
    removeFile: 'Remover arquivo',
    success: 'contatos importados com sucesso!',
    error: 'Erro ao importar',
    duplicates: 'duplicatas ignoradas (email ou telefone já existente)',
    emptyFile: 'Arquivo vazio ou sem dados válidos',
    invalidFormat: 'Formato inválido. Use um arquivo .csv',
    nameRequired: 'A coluna "nome" é obrigatória no arquivo',
    andMore: 'e mais',
  },
  en: {
    pageTitle: 'Import Contacts',
    pageSubtitle: 'Import your contacts from a CSV spreadsheet into the CRM',
    back: 'Back to CRM',
    step1Title: '1. Download the template',
    step1Desc: 'Use our official template to ensure your data is imported correctly. Fill in the columns with your contact information.',
    downloadTemplate: 'Download CSV template',
    step2Title: '2. Upload the filled file',
    step2Desc: 'After filling in the template, drag the file here or click to select.',
    dragDrop: 'Drag your CSV file here',
    or: 'or',
    browse: 'Select file',
    accepted: 'Accepts .csv files with columns: name, email, phone',
    columns: 'Accepted columns',
    colName: 'Name (required)',
    colEmail: 'Email',
    colPhone: 'Phone / WhatsApp',
    preview: 'Preview',
    rows: 'contacts found',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    importing: 'Importing...',
    import: 'Import Contacts',
    removeFile: 'Remove file',
    success: 'contacts imported successfully!',
    error: 'Import error',
    duplicates: 'duplicates skipped (email or phone already exists)',
    emptyFile: 'Empty file or no valid data',
    invalidFormat: 'Invalid format. Use a .csv file',
    nameRequired: 'The "name" column is required in the file',
    andMore: 'and more',
  },
  es: {
    pageTitle: 'Importar Contactos',
    pageSubtitle: 'Importa tus contactos desde una hoja CSV al CRM',
    back: 'Volver al CRM',
    step1Title: '1. Descarga el modelo',
    step1Desc: 'Usa nuestro modelo oficial para garantizar que los datos se importen correctamente. Completa las columnas con la información de tus contactos.',
    downloadTemplate: 'Descargar modelo CSV',
    step2Title: '2. Sube el archivo completado',
    step2Desc: 'Después de completar el modelo, arrastra el archivo aquí o haz clic para seleccionar.',
    dragDrop: 'Arrastra tu archivo CSV aquí',
    or: 'o',
    browse: 'Seleccionar archivo',
    accepted: 'Acepta archivos .csv con columnas: nombre, email, teléfono',
    columns: 'Columnas aceptadas',
    colName: 'Nombre (obligatorio)',
    colEmail: 'Email',
    colPhone: 'Teléfono / WhatsApp',
    preview: 'Vista previa',
    rows: 'contactos encontrados',
    name: 'Nombre',
    email: 'Email',
    phone: 'Teléfono',
    importing: 'Importando...',
    import: 'Importar Contactos',
    removeFile: 'Eliminar archivo',
    success: 'contactos importados con éxito!',
    error: 'Error al importar',
    duplicates: 'duplicados ignorados (email o teléfono ya existente)',
    emptyFile: 'Archivo vacío o sin datos válidos',
    invalidFormat: 'Formato inválido. Usa un archivo .csv',
    nameRequired: 'La columna "nombre" es obligatoria en el archivo',
    andMore: 'y más',
  },
}

type Language = keyof typeof T

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER CSV
// ═══════════════════════════════════════════════════════════════════════════════

interface ParsedRow {
  name: string
  email: string
  phone: string
}

const COL_MAP: Record<string, keyof ParsedRow> = {
  nome: 'name', name: 'name', nombre: 'name', 'nome completo': 'name', 'full name': 'name',
  email: 'email', 'e-mail': 'email', correo: 'email',
  telefone: 'phone', phone: 'phone', celular: 'phone', whatsapp: 'phone', tel: 'phone', 'teléfono': 'phone',
}

function parseCSV(rawText: string): ParsedRow[] {
  // Strip BOM character that Excel adds
  const text = rawText.replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^["'\uFEFF]|["']$/g, ''))
  const colIndexes: Partial<Record<keyof ParsedRow, number>> = {}

  headers.forEach((h, i) => {
    const mapped = COL_MAP[h]
    if (mapped && colIndexes[mapped] === undefined) colIndexes[mapped] = i
  })

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
    })
  }
  return rows
}

function downloadTemplate() {
  const bom = '\uFEFF'
  const csv = bom + 'nome;email;telefone\nJoao Silva;joao@email.com;55 11 99999-9999\nMaria Santos;maria@email.com;55 21 98888-8888\nCarlos Oliveira;carlos@email.com;55 54 93333-4444\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_leads.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════════

export default function CsvImportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const orgId = useActiveOrgId()

  const lang = (user?.language as Language) || 'pt'
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

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(t.invalidFormat)
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError(text.includes(',') || text.includes(';') ? t.nameRequired : t.emptyFile)
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
      // Verificar limite de leads do plano antes de importar
      const limitRes = await fetch(`/api/plan-limit?org_id=${orgId}&resource=leads`)
      const limitData = await limitRes.json()
      if (!limitData.allowed) {
        setError(`Limite de ${limitData.limit} leads atingido. Faça upgrade do plano para importar mais.`)
        setImporting(false)
        return
      }

      const { data: existing } = await supabase
        .from('leads')
        .select('email, phone')
        .eq('org_id', orgId)

      const existingEmails = new Set((existing || []).map(l => l.email?.toLowerCase()).filter(Boolean))
      const existingPhones = new Set((existing || []).map(l => l.phone?.replace(/\D/g, '')).filter(Boolean))

      // Fetch default stage
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('name')
        .eq('org_id', orgId)
        .order('position', { ascending: true })
        .limit(1)

      const defaultStage = stages?.[0]?.name || 'captado'

      const toInsert: any[] = []
      let duplicates = 0

      for (const row of rows) {
        const emailLower = row.email?.toLowerCase()
        const phoneClean = row.phone?.replace(/\D/g, '')

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
          stage: defaultStage,
          source: 'csv_import',
        })

        if (emailLower) existingEmails.add(emailLower)
        if (phoneClean) existingPhones.add(phoneClean)
      }

      // Limitar ao espaço disponível no plano
      const remaining = limitData.limit === -1 ? toInsert.length : Math.max(0, limitData.limit - limitData.current)
      const trimmed = toInsert.length > remaining ? toInsert.slice(0, remaining) : toInsert
      const skippedByLimit = toInsert.length - trimmed.length

      if (trimmed.length > 0) {
        for (let i = 0; i < trimmed.length; i += 100) {
          const batch = trimmed.slice(i, i + 100)
          const { error: insertError } = await supabase.from('leads').insert(batch)
          if (insertError) throw insertError
        }
      }

      setResult({ imported: trimmed.length, duplicates: duplicates + skippedByLimit })
      toast.success(`${toInsert.length} ${t.success}`)
    } catch (err: any) {
      setError(`${t.error}: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const previewRows = rows.slice(0, 5)
  const hasMore = rows.length > 5

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 md:p-6 lg:p-10" style={{ background: 'var(--color-bg-base)' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <button
            onClick={() => router.push('/dashboard/crm')}
            className="flex items-center gap-2 text-sm font-medium transition-colors group mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t.back}
          </button>

          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <FileSpreadsheet size={28} style={{ color: 'var(--color-primary)' }} />
            {t.pageTitle}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.pageSubtitle}</p>
        </div>

        {/* Success Result */}
        {result && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <CheckCircle2 size={24} style={{ color: 'rgb(16,185,129)' }} />
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: 'rgb(16,185,129)' }}>
                  {result.imported} {t.success}
                </p>
                {result.duplicates > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {result.duplicates} {t.duplicates}
                  </p>
                )}
                <button
                  onClick={() => router.push('/dashboard/crm')}
                  className="mt-3 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  <Users size={16} />
                  {t.back}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-error)' }} />
            <span className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</span>
          </div>
        )}

        {!result && (
          <>
            {/* Step 1: Download Template */}
            <div className="rounded-2xl p-5 md:p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t.step1Title}
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
                {t.step1Desc}
              </p>

              {/* Columns info */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t.colName, required: true },
                  { label: t.colEmail, required: false },
                  { label: t.colPhone, required: false },
                ].map((col) => (
                  <div
                    key={col.label}
                    className="text-xs px-3 py-2 rounded-lg text-center"
                    style={{
                      background: col.required ? 'var(--color-primary-subtle)' : 'var(--color-bg-hover)',
                      color: col.required ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      border: col.required ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                      fontWeight: col.required ? 600 : 400,
                    }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                <Download size={16} />
                {t.downloadTemplate}
              </button>
            </div>

            {/* Step 2: Upload */}
            <div className="rounded-2xl p-5 md:p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t.step2Title}
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
                {t.step2Desc}
              </p>

              {rows.length === 0 ? (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl cursor-pointer transition-all"
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: dragOver ? 'rgba(90,122,230,0.05)' : 'transparent',
                    }}
                  >
                    <Upload size={36} style={{ color: 'var(--color-text-tertiary)' }} />
                    <div className="text-center">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.dragDrop}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.or}</p>
                      <span className="inline-block mt-2 px-5 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
                        {t.browse}
                      </span>
                    </div>
                    <p className="text-[11px] text-center mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.accepted}</p>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                </>
              ) : (
                <>
                  {/* File info + remove */}
                  <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet size={20} style={{ color: 'var(--color-primary)' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{fileName}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{rows.length} {t.rows}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setRows([]); setFileName(''); setError('') }}
                      className="p-2 rounded-lg transition-colors shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      title={t.removeFile}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Preview table */}
                  <div className="overflow-x-auto rounded-xl mb-4" style={{ border: '1px solid var(--color-border)' }}>
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '30%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: 'var(--color-bg-hover)' }}>
                          <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.name}</th>
                          <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.email}</th>
                          <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.phone}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td className="px-4 py-2.5 truncate" style={{ color: 'var(--color-text-primary)' }}>{row.name}</td>
                            <td className="px-4 py-2.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{row.email || '—'}</td>
                            <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{row.phone || '—'}</td>
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

                  {/* Import button */}
                  <button
                    onClick={handleImport}
                    disabled={importing || !orgId}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    {importing ? (
                      <><Loader2 size={16} className="animate-spin" /> {t.importing}</>
                    ) : (
                      <><Upload size={16} /> {t.import} ({rows.length})</>
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
