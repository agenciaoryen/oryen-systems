'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--color-bg-base)' }}>
      {/* Background effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.06]"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)' }} />
      <div className="fixed inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-150 mb-8"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
            <ArrowLeft size={16} />
            Voltar ao inicio
          </Link>

          <div className="flex justify-center mb-6">
            <span className="text-2xl font-extrabold tracking-widest"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>ORYEN</span>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Politica de Privacidade
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Ultima atualizacao: 07 de abril de 2026
          </p>
        </div>

        {/* Content */}
        <div className="rounded-2xl p-8 space-y-8"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>

          <Section title="1. Introducao">
            <p>
              A Oryen ("nos", "nosso" ou "plataforma") e uma plataforma SaaS de CRM desenvolvida por Letierre Rodrigues, destinada a corretores e imobiliarias no Brasil. Esta Politica de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais em conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei n. 13.709/2018).
            </p>
            <p>
              Ao utilizar a plataforma Oryen, voce concorda com as praticas descritas nesta politica.
            </p>
          </Section>

          <Section title="2. Dados que Coletamos">
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul>
              <li><strong>Dados de cadastro:</strong> nome, email, telefone, CNPJ/CPF, nome da imobiliaria e dados do plano contratado.</li>
              <li><strong>Dados de uso:</strong> logs de acesso, interacoes com a plataforma, preferencias e configuracoes.</li>
              <li><strong>Dados de imoveis:</strong> fotos, descricoes, valores e informacoes de localizacao dos imoveis cadastrados.</li>
              <li><strong>Dados de leads e contatos:</strong> informacoes de clientes e prospects gerenciados pelo usuario na plataforma.</li>
              <li><strong>Dados de pagamento:</strong> processados de forma segura por meio do Stripe. Nao armazenamos dados completos de cartao de credito em nossos servidores.</li>
            </ul>
          </Section>

          <Section title="3. Dados do WhatsApp">
            <p>
              A Oryen integra-se ao WhatsApp por meio da API oficial do WhatsApp Cloud (Meta). Ao conectar sua conta, podemos processar:
            </p>
            <ul>
              <li>Mensagens enviadas e recebidas no contexto do atendimento ao cliente.</li>
              <li>Numeros de telefone e nomes de contatos.</li>
              <li>Midias compartilhadas (fotos de imoveis, documentos).</li>
              <li>Metadados de conversas (horarios, status de entrega).</li>
            </ul>
            <p>
              Esses dados sao utilizados exclusivamente para funcionalidades de CRM e atendimento automatizado. Nao vendemos nem compartilhamos conversas do WhatsApp com terceiros.
            </p>
          </Section>

          <Section title="4. Processamento por Inteligencia Artificial">
            <p>
              A Oryen utiliza modelos de inteligencia artificial (Claude, da Anthropic) para:
            </p>
            <ul>
              <li>Gerar respostas automatizadas no atendimento via WhatsApp (agente SDR).</li>
              <li>Analisar e categorizar leads.</li>
              <li>Gerar descricoes e conteudos para imoveis.</li>
              <li>Oferecer recomendacoes inteligentes ao usuario.</li>
            </ul>
            <p>
              Os dados enviados para processamento por IA sao transmitidos de forma segura e nao sao utilizados para treinamento de modelos de terceiros. O processamento e realizado sob nossa responsabilidade como controlador de dados.
            </p>
          </Section>

          <Section title="5. Armazenamento de Dados">
            <p>
              Seus dados sao armazenados de forma segura utilizando o Supabase, uma plataforma de banco de dados com criptografia em repouso e em transito. Os servidores estao localizados em data centers com certificacoes de seguranca internacionais.
            </p>
            <p>
              Adotamos medidas tecnicas e organizacionais adequadas para proteger seus dados contra acesso nao autorizado, perda ou alteracao.
            </p>
          </Section>

          <Section title="6. Pagamentos e Dados Financeiros">
            <p>
              Todos os pagamentos sao processados pelo Stripe, que opera em conformidade com os padroes PCI-DSS. A Oryen nao armazena dados completos de cartoes de credito. Mantemos apenas registros de transacoes (valores, datas e status) para fins de controle e emissao de recibos.
            </p>
          </Section>

          <Section title="7. Cookies e Tecnologias de Rastreamento">
            <p>Utilizamos cookies e tecnologias similares para:</p>
            <ul>
              <li>Manter sua sessao autenticada.</li>
              <li>Lembrar suas preferencias e configuracoes.</li>
              <li>Analisar o uso da plataforma e melhorar a experiencia do usuario.</li>
            </ul>
            <p>
              Voce pode gerenciar as preferencias de cookies nas configuracoes do seu navegador. A desativacao de cookies essenciais pode afetar o funcionamento da plataforma.
            </p>
          </Section>

          <Section title="8. Compartilhamento de Dados">
            <p>Seus dados podem ser compartilhados com:</p>
            <ul>
              <li><strong>Stripe:</strong> para processamento de pagamentos.</li>
              <li><strong>Supabase:</strong> para armazenamento e gerenciamento de dados.</li>
              <li><strong>Meta (WhatsApp Cloud API):</strong> para envio e recebimento de mensagens.</li>
              <li><strong>Anthropic (Claude):</strong> para processamento de inteligencia artificial.</li>
            </ul>
            <p>
              Nao vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </Section>

          <Section title="9. Seus Direitos (LGPD)">
            <p>
              De acordo com a LGPD, voce tem os seguintes direitos em relacao aos seus dados pessoais:
            </p>
            <ul>
              <li>Confirmacao da existencia de tratamento de dados.</li>
              <li>Acesso aos seus dados pessoais.</li>
              <li>Correcao de dados incompletos, inexatos ou desatualizados.</li>
              <li>Anonimizacao, bloqueio ou eliminacao de dados desnecessarios ou excessivos.</li>
              <li>Portabilidade dos dados a outro fornecedor.</li>
              <li>Eliminacao dos dados tratados com consentimento.</li>
              <li>Informacao sobre o compartilhamento de dados com terceiros.</li>
              <li>Revogacao do consentimento.</li>
            </ul>
            <p>
              Para exercer qualquer desses direitos, entre em contato conosco por meio dos canais indicados abaixo.
            </p>
          </Section>

          <Section title="10. Retencao de Dados">
            <p>
              Retemos seus dados pessoais enquanto sua conta estiver ativa ou conforme necessario para cumprir obrigacoes legais, resolver disputas e fazer cumprir nossos acordos. Apos o encerramento da conta, seus dados serao excluidos ou anonimizados em ate 90 dias, salvo obrigacao legal em contrario.
            </p>
          </Section>

          <Section title="11. Alteracoes nesta Politica">
            <p>
              Podemos atualizar esta Politica de Privacidade periodicamente. Alteracoes significativas serao comunicadas por email ou por notificacao na plataforma. A data da ultima atualizacao sera sempre indicada no topo deste documento.
            </p>
          </Section>

          <Section title="12. Contato">
            <p>
              Para duvidas, solicitacoes ou exercicio de direitos relacionados a esta politica, entre em contato:
            </p>
            <ul>
              <li><strong>Responsavel:</strong> Letierre Rodrigues</li>
              <li><strong>Email:</strong> contato@oryen.ai</li>
              <li><strong>Plataforma:</strong> oryen.ai</li>
            </ul>
          </Section>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 text-center text-sm space-y-3"
          style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="transition-colors duration-150"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
              Termos de Uso
            </Link>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <Link href="/" className="transition-colors duration-150"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
              Pagina Inicial
            </Link>
          </div>
          <p>&copy; 2026 Oryen. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_p]:leading-relaxed"
        style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </div>
    </section>
  )
}
