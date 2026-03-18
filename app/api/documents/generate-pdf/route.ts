// app/api/documents/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  try {
    // Inicializar client dentro da função para evitar erro no build
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar documento
    const { data: document, error: docError } = await supabaseAdmin
      .from('lead_documents')
      .select('*, lead:leads(name)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    if (!document.content_html) {
      return NextResponse.json(
        { error: 'Documento não tem conteúdo HTML' },
        { status: 400 }
      )
    }

    // Gerar PDF com Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Definir conteúdo HTML
    await page.setContent(document.content_html, {
      waitUntil: 'networkidle0'
    })

    // Gerar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    await browser.close()

    // Nome do arquivo
    const timestamp = Date.now()
    const safeName = document.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
    const fileName = `${document.org_id}/${document.lead_id}/${safeName}-${timestamp}.pdf`

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return NextResponse.json(
        { error: 'Erro ao salvar PDF: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Obter URL pública
    const { data: urlData } = supabaseAdmin
      .storage
      .from('documents')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // Atualizar documento com URL do PDF
    const { error: updateError } = await supabaseAdmin
      .from('lead_documents')
      .update({
        file_url: publicUrl,
        file_name: `${safeName}.pdf`,
        file_type: 'application/pdf',
        file_size: pdfBuffer.length,
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Erro ao atualizar documento:', updateError)
    }

    // Registrar no histórico
    await supabaseAdmin.from('lead_document_history').insert({
      document_id: documentId,
      action: 'downloaded',
      details: { file_name: `${safeName}.pdf`, file_size: pdfBuffer.length }
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: `${safeName}.pdf`,
      size: pdfBuffer.length
    })

  } catch (error: any) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json(
      { error: 'Erro interno: ' + error.message },
      { status: 500 }
    )
  }
}