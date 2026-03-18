// app/api/documents/mark-sent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Inicializar client dentro da função para evitar erro no build
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { documentId, via, to } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId é obrigatório' },
        { status: 400 }
      )
    }

    // Atualizar documento
    const { error: updateError } = await supabaseAdmin
      .from('lead_documents')
      .update({
        status: 'sent',
        sent_via: via || 'whatsapp',
        sent_at: new Date().toISOString(),
        sent_to: to || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Erro ao atualizar documento:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar documento' },
        { status: 500 }
      )
    }

    // Registrar no histórico
    await supabaseAdmin.from('lead_document_history').insert({
      document_id: documentId,
      action: 'sent',
      details: { via, to }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno: ' + error.message },
      { status: 500 }
    )
  }
}