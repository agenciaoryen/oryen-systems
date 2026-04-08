'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
            Termos de Uso
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Ultima atualizacao: 07 de abril de 2026
          </p>
        </div>

        {/* Content */}
        <div className="rounded-2xl p-8 space-y-8"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>

          <Section title="1. Aceitacao dos Termos">
            <p>
              Ao acessar ou utilizar a plataforma Oryen ("Plataforma"), desenvolvida e mantida por Letierre Rodrigues ("Fornecedor"), voce ("Usuario") concorda integralmente com estes Termos de Uso. Caso nao concorde com qualquer disposicao, nao utilize a Plataforma.
            </p>
            <p>
              O uso continuado da Plataforma apos quaisquer alteracoes nestes Termos constitui aceitacao das modificacoes.
            </p>
          </Section>

          <Section title="2. Descricao do Servico">
            <p>
              A Oryen e uma plataforma SaaS (Software como Servico) de CRM projetada para corretores de imoveis e imobiliarias. A Plataforma oferece:
            </p>
            <ul>
              <li>Gerenciamento de leads e contatos.</li>
              <li>Integracao com WhatsApp via API oficial (Meta) para atendimento automatizado.</li>
              <li>Agente de inteligencia artificial (SDR) para qualificacao e atendimento de leads.</li>
              <li>Portfolio unificado de imoveis com publicacao em multiplos canais.</li>
              <li>Automacoes de marketing e acompanhamento de clientes.</li>
              <li>Dashboard com metricas e relatorios.</li>
            </ul>
          </Section>

          <Section title="3. Cadastro e Conta do Usuario">
            <p>Para utilizar a Plataforma, o Usuario deve:</p>
            <ul>
              <li>Fornecer informacoes verdadeiras, completas e atualizadas durante o cadastro.</li>
              <li>Manter a confidencialidade de suas credenciais de acesso (email e senha).</li>
              <li>Notificar imediatamente o Fornecedor sobre qualquer uso nao autorizado de sua conta.</li>
              <li>Ser maior de 18 anos ou possuir autorizacao legal para contratar servicos.</li>
            </ul>
            <p>
              O Usuario e integralmente responsavel por todas as atividades realizadas em sua conta.
            </p>
          </Section>

          <Section title="4. Obrigacoes do Usuario">
            <p>Ao utilizar a Plataforma, o Usuario compromete-se a:</p>
            <ul>
              <li>Utilizar a Plataforma em conformidade com a legislacao brasileira vigente.</li>
              <li>Respeitar os direitos de terceiros, incluindo direitos de propriedade intelectual e privacidade.</li>
              <li>Nao utilizar a Plataforma para envio de spam ou mensagens nao solicitadas em massa.</li>
              <li>Nao tentar acessar areas restritas, sistemas ou dados de outros usuarios.</li>
              <li>Nao reproduzir, copiar, modificar ou distribuir o software da Plataforma.</li>
              <li>Garantir que os dados de clientes e leads inseridos na Plataforma foram coletados em conformidade com a LGPD.</li>
            </ul>
          </Section>

          <Section title="5. Uso Aceitavel">
            <p>E expressamente proibido:</p>
            <ul>
              <li>Utilizar a Plataforma para atividades ilegais, fraudulentas ou enganosas.</li>
              <li>Enviar conteudo ofensivo, discriminatorio ou que viole direitos de terceiros via WhatsApp ou qualquer canal integrado.</li>
              <li>Sobrecarregar intencionalmente os servidores ou infraestrutura da Plataforma.</li>
              <li>Utilizar bots, scrapers ou ferramentas automatizadas nao autorizadas para acessar a Plataforma.</li>
              <li>Revender, sublicenciar ou compartilhar o acesso a conta com terceiros sem autorizacao.</li>
              <li>Manipular ou interferir no funcionamento da inteligencia artificial integrada.</li>
            </ul>
            <p>
              O descumprimento desta clausula pode resultar na suspensao ou encerramento imediato da conta, sem direito a reembolso.
            </p>
          </Section>

          <Section title="6. Planos e Pagamento">
            <p>
              A Plataforma oferece planos de assinatura com diferentes funcionalidades e limites. As condicoes de pagamento sao as seguintes:
            </p>
            <ul>
              <li>Os pagamentos sao processados de forma segura pelo Stripe.</li>
              <li>As assinaturas sao renovadas automaticamente ao final de cada periodo (mensal ou anual), salvo cancelamento previo.</li>
              <li>O cancelamento pode ser realizado a qualquer momento pela Plataforma, com efeito ao final do periodo vigente.</li>
              <li>Nao ha reembolso proporcional para cancelamentos realizados durante o periodo de cobranca, exceto nos casos previstos pelo Codigo de Defesa do Consumidor.</li>
              <li>O Fornecedor reserva-se o direito de alterar precos mediante aviso previo de 30 dias.</li>
            </ul>
          </Section>

          <Section title="7. Propriedade Intelectual">
            <p>
              Todos os direitos de propriedade intelectual relacionados a Plataforma, incluindo software, design, marca, logotipos, textos e algoritmos, pertencem exclusivamente ao Fornecedor.
            </p>
            <p>
              O Usuario mantem a titularidade de todos os dados e conteudos que insere na Plataforma (imoveis, fotos, informacoes de clientes). Ao utilizar a Plataforma, o Usuario concede ao Fornecedor uma licenca limitada para processar esses dados exclusivamente para prestacao do servico.
            </p>
            <p>
              O conteudo gerado pela inteligencia artificial da Plataforma (descricoes, respostas automatizadas) pode ser utilizado livremente pelo Usuario no ambito de suas atividades profissionais.
            </p>
          </Section>

          <Section title="8. Disponibilidade e Suporte">
            <p>
              O Fornecedor empenhara esforcos razoaveis para manter a Plataforma disponivel 24 horas por dia, 7 dias por semana. No entanto, nao garantimos disponibilidade ininterrupta, podendo ocorrer interrupcoes para manutencao, atualizacoes ou por motivos de forca maior.
            </p>
            <p>
              O suporte tecnico e oferecido por meio dos canais oficiais da Plataforma, em horario comercial.
            </p>
          </Section>

          <Section title="9. Limitacao de Responsabilidade">
            <p>Na extensao maxima permitida pela legislacao brasileira:</p>
            <ul>
              <li>A Plataforma e fornecida "no estado em que se encontra" (as is), sem garantias expressas ou implicitas de adequacao a fins especificos.</li>
              <li>O Fornecedor nao se responsabiliza por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso da Plataforma.</li>
              <li>O Fornecedor nao se responsabiliza pelo conteudo das mensagens enviadas pelo Usuario via WhatsApp ou outros canais.</li>
              <li>O Fornecedor nao garante resultados especificos de vendas, conversao de leads ou desempenho comercial.</li>
              <li>As respostas geradas pela inteligencia artificial sao auxiliares e nao substituem o julgamento profissional do Usuario.</li>
              <li>A responsabilidade total do Fornecedor, em qualquer hipotese, sera limitada ao valor pago pelo Usuario nos ultimos 12 meses de assinatura.</li>
            </ul>
          </Section>

          <Section title="10. Suspensao e Encerramento">
            <p>O Fornecedor podera suspender ou encerrar a conta do Usuario nos seguintes casos:</p>
            <ul>
              <li>Violacao destes Termos de Uso ou da Politica de Privacidade.</li>
              <li>Uso da Plataforma para atividades ilegais.</li>
              <li>Inadimplencia no pagamento da assinatura apos o periodo de carencia.</li>
              <li>Solicitacao do proprio Usuario.</li>
              <li>Determinacao judicial ou administrativa.</li>
            </ul>
            <p>
              Em caso de encerramento, o Usuario podera solicitar a exportacao de seus dados em ate 30 dias apos o encerramento. Apos esse prazo, os dados serao excluidos permanentemente.
            </p>
          </Section>

          <Section title="11. Alteracoes nos Termos">
            <p>
              O Fornecedor reserva-se o direito de modificar estes Termos a qualquer momento. Alteracoes significativas serao comunicadas com antecedencia minima de 15 dias por email ou notificacao na Plataforma. O uso continuado da Plataforma apos a entrada em vigor das alteracoes constitui aceitacao dos novos Termos.
            </p>
          </Section>

          <Section title="12. Legislacao Aplicavel e Foro">
            <p>
              Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Fica eleito o foro da comarca do domicilio do Fornecedor para dirimir quaisquer controversias decorrentes destes Termos, com renunciae a qualquer outro, por mais privilegiado que seja.
            </p>
            <p>
              As partes comprometem-se a buscar solucao amigavel para eventuais conflitos antes de recorrer ao Poder Judiciario.
            </p>
          </Section>

          <Section title="13. Contato">
            <p>Para duvidas ou solicitacoes relacionadas a estes Termos:</p>
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
            <Link href="/privacy" className="transition-colors duration-150"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
              Politica de Privacidade
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
