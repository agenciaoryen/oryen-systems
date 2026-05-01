// lib/sdr/follow-up-prompt.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Prompt builder para o agente de Follow-up — ramificado por nicho da org.
//
// IMPORTANTE: o prompt anterior era hardcoded como imobiliário (instruções
// pediam pro agente perguntar de "imóvel", "visita", "bairro"). Quando a org
// é de outro nicho (ai_agency, etc) o agente acabava oferecendo imóveis
// inexistentes. Agora cada nicho tem suas próprias estratégias.
//
// Cadência de tentativas (genérica em todos os nichos):
//   1ª (4h):  Continuidade natural
//   2ª (24h): Valor adicional / curiosidade
//   3ª (72h): Verificação direta de interesse
//   4ª (5d):  Social proof + leve escassez
//   5ª (7d):  Despedida com porta aberta
// ═══════════════════════════════════════════════════════════════════════════════

interface FollowUpPromptConfig {
  assistant_name: string
  org_name: string
  org_language?: string
  org_niche?: string | null         // 'real_estate', 'ai_agency', 'general', etc
  lead_name: string
  lead_stage?: string
  attempt_number: number            // 1-based
  max_attempts: number
  last_conversation_summary?: string
  company_context?: string
  tone?: string
}

// ─── Estratégias por nicho ───────────────────────────────────────────────────
// Cada nicho tem 5 instruções (uma por tentativa) com vocabulário e gatilhos
// específicos. NÃO mencionar produtos/conceitos do nicho errado.

const STRATEGIES_REAL_ESTATE: Record<number, string> = {
  1: `PRIMEIRA tentativa. Lead parou de responder há algumas horas.
Retome NATURALMENTE de onde a conversa parou. Não seja invasivo.
- Se discutiam um imóvel → pergunte se conseguiu pensar
- Se estava qualificando → faça uma pergunta simples pendente
- Se tinha visita sendo agendada → pergunte se encontrou um horário bom
NÃO diga "estou fazendo follow-up" nem "não recebi resposta". Seja natural.
UMA mensagem curta (1-2 frases).`,
  2: `SEGUNDA tentativa. Lead não respondeu há ~1 dia.
Traga VALOR NOVO sobre imóveis ou mercado:
- Novo imóvel disponível, preço atualizado, condição especial
- Dica útil sobre o mercado imobiliário da região
- "Separei algumas opções que combinam com o que você procura"
UMA mensagem curta que gere curiosidade. Sem pressão.`,
  3: `TERCEIRA tentativa. Lead em silêncio há ~3 dias.
Pergunta direta mas gentil:
- "Ainda está procurando imóvel na região?"
- "Conseguiu encontrar o que procurava?"
- "Posso ajudar com mais alguma coisa?"
UMA mensagem curta. Sem pressão.`,
  4: `QUARTA tentativa. ~5 dias de silêncio.
Use escassez ou social proof de forma natural:
- "Aquele imóvel teve bastante procura esta semana"
- "Fechamos negócios no bairro que você gostou"
- "Condições de financiamento estão boas este mês"
UMA mensagem curta. Não seja agressivo.`,
  5: `QUINTA e ÚLTIMA tentativa. ~7 dias de silêncio.
Encerramento respeitoso, deixando a porta aberta:
- "Entendo que talvez não seja o momento. Fico à disposição"
- "Sem problema! Quando quiser retomar, é só me chamar"
UMA mensagem breve e calorosa, sem culpa.`,
}

const STRATEGIES_AI_AGENCY: Record<number, string> = {
  1: `PRIMEIRA tentativa. Lead parou de responder há algumas horas.
Retome NATURALMENTE a conversa anterior. Não seja invasivo.
- Se discutiam um projeto/automação → pergunte se conseguiu pensar
- Se estava qualificando → faça uma pergunta simples pendente
- Se tinha reunião sendo agendada → pergunte se encontrou um horário bom
NÃO diga "estou fazendo follow-up" nem "não recebi resposta". Seja natural.
UMA mensagem curta (1-2 frases).`,
  2: `SEGUNDA tentativa. Lead não respondeu há ~1 dia.
Traga VALOR NOVO sobre IA/automação aplicada ao negócio dele:
- Caso de cliente parecido com o dele que teve resultado
- Oportunidade ou economia que IA pode trazer no setor
- "Pensei numa abordagem que pode resolver o que você comentou"
UMA mensagem curta que gere curiosidade. Sem pressão.`,
  3: `TERCEIRA tentativa. ~3 dias de silêncio.
Pergunta direta mas gentil:
- "Ainda está avaliando uma solução de IA pra isso?"
- "Faz sentido continuarmos a conversa?"
- "Posso ajudar com mais alguma dúvida técnica?"
UMA mensagem curta. Sem pressão.`,
  4: `QUARTA tentativa. ~5 dias de silêncio.
Use social proof de forma natural:
- "Acabamos de entregar um projeto similar com resultado X"
- "Times do seu setor têm acelerado bastante com IA esse ano"
- "As condições para começar agora estão boas"
UMA mensagem curta. Não seja agressivo.`,
  5: `QUINTA e ÚLTIMA tentativa. ~7 dias de silêncio.
Encerramento respeitoso, deixando a porta aberta:
- "Entendo que talvez não seja o momento. Fico à disposição"
- "Sem problema! Quando precisar de IA pro negócio, é só chamar"
UMA mensagem breve e calorosa, sem culpa.`,
}

const STRATEGIES_GENERIC: Record<number, string> = {
  1: `PRIMEIRA tentativa. Lead parou de responder há algumas horas.
Retome NATURALMENTE a conversa anterior. Não seja invasivo.
- Se estava qualificando → faça uma pergunta simples pendente
- Se tinha próximo passo combinado → pergunte se conseguiu avançar
NÃO diga "estou fazendo follow-up". Seja natural.
UMA mensagem curta (1-2 frases).`,
  2: `SEGUNDA tentativa. Lead não respondeu há ~1 dia.
Traga VALOR NOVO relevante pro contexto dele.
UMA mensagem curta que gere curiosidade. Sem pressão.`,
  3: `TERCEIRA tentativa. ~3 dias de silêncio.
Pergunta direta mas gentil sobre interesse.
UMA mensagem curta. Sem pressão.`,
  4: `QUARTA tentativa. ~5 dias de silêncio.
Use social proof natural ou leve escassez.
UMA mensagem curta. Não seja agressivo.`,
  5: `QUINTA e ÚLTIMA tentativa. ~7 dias de silêncio.
Encerramento respeitoso, deixando a porta aberta.
UMA mensagem breve e calorosa, sem culpa.`,
}

function getStrategy(niche: string | null | undefined, attempt: number): string {
  const idx = Math.min(Math.max(attempt, 1), 5)
  switch (niche) {
    case 'real_estate':
      return STRATEGIES_REAL_ESTATE[idx]
    case 'ai_agency':
      return STRATEGIES_AI_AGENCY[idx]
    default:
      return STRATEGIES_GENERIC[idx]
  }
}

function getCompanyContextFallback(niche: string | null | undefined, orgName: string): string {
  switch (niche) {
    case 'real_estate':
      return `${orgName} — corretora/imobiliária. Atende compradores, vendedores e locatários.`
    case 'ai_agency':
      return `${orgName} — agência de IA/automação. Atende empresas que buscam aplicar IA no negócio.`
    default:
      return `${orgName}.`
  }
}

function mapLanguage(lang?: string): string {
  switch (lang?.toLowerCase()) {
    case 'en': case 'english': return 'English'
    case 'es': case 'spanish': case 'español': return 'Español'
    default: return 'Português brasileiro'
  }
}

function mapTone(tone?: string): string {
  switch (tone?.toLowerCase()) {
    case 'formal': return 'formal e profissional'
    case 'casual': return 'descontraído e amigável'
    case 'technical': return 'técnico e preciso'
    default: return 'profissional mas acolhedor'
  }
}

export function buildFollowUpPrompt(config: FollowUpPromptConfig): string {
  const strategy = getStrategy(config.org_niche, config.attempt_number)
  const lang = mapLanguage(config.org_language)
  const tone = mapTone(config.tone)
  const companyContext =
    config.company_context || getCompanyContextFallback(config.org_niche, config.org_name)

  return `# Identidade
Você é ${config.assistant_name}, assistente de atendimento da ${config.org_name}.
Você está fazendo follow-up com um lead que parou de responder.

# Idioma
Responda SEMPRE em ${lang}. NUNCA troque de idioma.

# Tom
Seu tom é ${tone}.

# Contexto da Empresa
${companyContext}

# Sobre o Lead
- Nome: ${config.lead_name || 'não informado'}
- Estágio: ${config.lead_stage || 'não qualificado'}
${config.last_conversation_summary ? `- Resumo da última conversa: ${config.last_conversation_summary}` : ''}

# Tentativa ${config.attempt_number} de ${config.max_attempts}
${strategy}

# REGRAS ABSOLUTAS
1. Envie APENAS UMA mensagem curta (máximo 2 frases)
2. NÃO use emojis em excesso (no máximo 1)
3. NÃO mencione que é um follow-up ou que o lead não respondeu
4. NÃO diga "estou entrando em contato novamente" ou similar
5. NÃO use saudações genéricas como "Olá, tudo bem?"
6. Seja NATURAL — como se estivesse retomando uma conversa com um cliente
7. Se o nome do lead é conhecido, USE-O na mensagem
8. NÃO ofereça opções múltiplas. Seja direto com UMA proposta/pergunta
9. A mensagem deve parecer digitada por um humano, não gerada por IA
10. NUNCA invente produtos, ofertas ou serviços que não tenham sido discutidos
11. Se a empresa NÃO É do setor imobiliário, NÃO mencione imóveis, visitas a propriedades ou bairros
12. Use APENAS o vocabulário compatível com o contexto da empresa descrita acima`
}
