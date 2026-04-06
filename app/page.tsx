'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Menu,
  X,
  ArrowRight,
  Check,
  ChevronDown,
  BarChart3,
  Bot,
  MessageSquare,
  Globe,
  FileText,
  Zap,
  Users,
  Shield,
  Clock,
  TrendingUp,
  Building2,
  Sparkles,
  Crown,
  Phone,
  Mail,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// DADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURES = [
  {
    icon: BarChart3,
    title: 'CRM Imobiliario',
    description: 'Pipeline visual com etapas do mercado imobiliario. Arraste e solte leads entre fases como Novo Lead, Visita Agendada, Proposta e Fechamento.',
    color: 'var(--color-primary)',
  },
  {
    icon: Bot,
    title: 'Agentes de IA',
    description: 'SDR e Hunter automatizam prospecao e qualificao de leads. Seus agentes trabalham 24h enviando mensagens e agendando visitas.',
    color: 'var(--color-accent)',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description: 'Atendimento bidirecional direto no sistema. Historico completo de conversas, deteccao de sentimento e respostas rapidas.',
    color: '#22C55E',
  },
  {
    icon: Globe,
    title: 'Site de Imoveis',
    description: 'Portfolio online profissional gerado automaticamente. Formulario de contato integrado ao CRM com distribuicao automatica de leads.',
    color: '#38BDF8',
  },
  {
    icon: FileText,
    title: 'Documentos Inteligentes',
    description: 'Propostas e contratos com templates personalizaveis. Gere PDFs, envie por email ou WhatsApp e acompanhe o ciclo de assinatura.',
    color: '#A78BFA',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard e Relatorios',
    description: 'KPIs em tempo real, graficos de conversao e relatorios automatizados. Saiba exatamente o desempenho da sua operacao.',
    color: '#F472B6',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Crie sua conta',
    description: 'Cadastre-se, configure sua empresa e escolha o plano ideal em menos de 2 minutos.',
  },
  {
    number: '02',
    title: 'Configure seu pipeline',
    description: 'Pipeline padrao para o mercado imobiliario ja vem pronto. Personalize etapas, tags e equipe.',
  },
  {
    number: '03',
    title: 'Feche mais negocios',
    description: 'Deixe os agentes de IA prospectar e qualificar enquanto voce foca no que importa: fechar.',
  },
]

const PLANS = [
  {
    name: 'Basic',
    price: 97,
    priceUsd: 19,
    description: 'Para corretores autonomos',
    color: 'var(--color-primary)',
    popular: false,
    features: [
      '1 usuario',
      'Ate 1.000 leads ativos',
      'CRM com pipeline visual',
      'WhatsApp (1 numero)',
      'Site de imoveis',
      'Documentos e templates',
    ],
    notIncluded: [
      'Agentes de IA',
      'Automacoes',
      'Relatorios avancados',
    ],
  },
  {
    name: 'Gold',
    price: 1097,
    priceUsd: 219,
    description: 'Para equipes em crescimento',
    color: 'var(--color-accent)',
    popular: true,
    features: [
      'Ate 5 usuarios',
      'Ate 5.000 leads ativos',
      'Tudo do Basic +',
      'Agentes de IA (SDR + Hunter)',
      'Automacoes inteligentes',
      'WhatsApp oficial (5 numeros)',
      'Relatorios e dashboard avancado',
      '10.000 mensagens IA/mes',
    ],
    notIncluded: [
      'API e integracoes avancadas',
      'Campanhas em massa',
    ],
  },
  {
    name: 'Diamond',
    price: 1647,
    priceUsd: 329,
    description: 'Para imobiliarias completas',
    color: '#A78BFA',
    popular: false,
    features: [
      'Ate 15 usuarios',
      'Ate 10.000 leads ativos',
      'Tudo do Gold +',
      'API e integracoes avancadas',
      'Campanhas em massa',
      'WhatsApp oficial (15 numeros)',
      'Suporte prioritario',
      '50.000 mensagens IA/mes',
    ],
    notIncluded: [],
  },
]

const FAQS = [
  {
    q: 'Preciso instalar alguma coisa?',
    a: 'Nao. O Oryen e 100% na nuvem. Funciona no navegador do computador ou celular, sem instalacao.',
  },
  {
    q: 'Posso testar antes de pagar?',
    a: 'Oferecemos um periodo de demonstracao para voce conhecer a plataforma. Entre em contato com nosso time para agendar.',
  },
  {
    q: 'Como funciona a integracao com WhatsApp?',
    a: 'Voce conecta seu numero de WhatsApp diretamente no painel. Todas as mensagens chegam no sistema em tempo real, com historico completo e deteccao de sentimento.',
  },
  {
    q: 'Os agentes de IA substituem minha equipe?',
    a: 'Nao. Os agentes automatizam tarefas repetitivas como prospecao e qualificacao, liberando sua equipe para focar no atendimento personalizado e fechamento.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. Sem fidelidade e sem multa. Voce pode fazer upgrade, downgrade ou cancelar direto no painel de configuracoes.',
  },
  {
    q: 'O site de imoveis substitui meu site atual?',
    a: 'Ele pode ser seu site principal ou complementar. E um site profissional gerado automaticamente a partir do seu portfolio, com dominio personalizado e formulario integrado ao CRM.',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          NAVBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(8,8,14,0.85)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Oryen" className="h-8" />
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                Funcionalidades
              </a>
              <a href="#how-it-works" className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                Como funciona
              </a>
              <a href="#pricing" className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                Planos
              </a>
              <a href="#faq" className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                FAQ
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
              >
                Comecar gratis
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: 'var(--color-text-secondary)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>Funcionalidades</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>Como funciona</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>Planos</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>FAQ</a>
              <div className="pt-2 flex flex-col gap-2">
                <Link href="/login" className="text-center text-sm px-4 py-2.5 rounded-lg" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Entrar</Link>
                <Link href="/register" className="text-center text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ background: 'var(--color-primary)', color: '#fff' }}>Comecar gratis</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20 blur-[120px]" style={{ background: 'var(--color-primary)' }} />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]" style={{ background: 'var(--color-accent)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-subtle-fg)', border: '1px solid rgba(75,107,251,0.2)' }}>
            <Sparkles size={14} />
            Plataforma com Inteligencia Artificial
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
            Voce fecha.{' '}
            <span style={{ color: 'var(--color-primary)' }}>A gente cuida</span>{' '}
            do resto.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            CRM, automacao e agentes de IA feitos exclusivamente para corretores de imoveis e imobiliarias. Tudo em um so lugar.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 32px rgba(75,107,251,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Comecar agora
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#pricing"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium transition-all"
              style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              Ver planos
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            <span className="flex items-center gap-2"><Shield size={14} /> Dados criptografados</span>
            <span className="flex items-center gap-2"><Clock size={14} /> Setup em 2 minutos</span>
            <span className="flex items-center gap-2"><Zap size={14} /> Sem instalacao</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
              Tudo que voce precisa para{' '}
              <span style={{ color: 'var(--color-accent)' }}>vender mais</span>
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Uma plataforma completa que substitui dezenas de ferramentas. Do primeiro contato ao fechamento.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={i}
                  className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-subtle)')}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
                  >
                    <Icon size={22} style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 md:py-32" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
              Comece em{' '}
              <span style={{ color: 'var(--color-primary)' }}>3 passos</span>
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Do cadastro ao primeiro lead qualificado em minutos, nao semanas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step, i) => (
              <div key={i} className="text-center md:text-left">
                <div
                  className="inline-flex text-3xl font-bold mb-4"
                  style={{ color: 'var(--color-primary)', opacity: 0.5, fontFamily: 'var(--font-plus-jakarta)' }}
                >
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HIGHLIGHT — CRM + IA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-subtle-fg)' }}>
                <Bot size={14} />
                Inteligencia Artificial
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                Seus agentes trabalham enquanto voce dorme
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                Os agentes de IA do Oryen prospectam novos leads, qualificam contatos e agendam visitas automaticamente. Voce acorda com leads quentes prontos para fechar.
              </p>
              <ul className="space-y-3">
                {[
                  'SDR automatiza o primeiro contato via WhatsApp',
                  'Hunter encontra novos prospects no seu mercado',
                  'Qualificacao inteligente baseada em comportamento',
                  'Agendamento automatico de visitas',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual placeholder — abstract card grid */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl opacity-20 blur-[60px]" style={{ background: 'var(--color-accent)' }} />
              <div className="relative grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: 'Leads Qualificados', value: '847', trend: '+23%' },
                  { icon: MessageSquare, label: 'Mensagens Enviadas', value: '12.4k', trend: '+18%' },
                  { icon: Phone, label: 'Visitas Agendadas', value: '156', trend: '+31%' },
                  { icon: TrendingUp, label: 'Taxa de Conversao', value: '34%', trend: '+5%' },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={i}
                      className="p-5 rounded-2xl"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <Icon size={18} style={{ color: 'var(--color-accent)', marginBottom: 12 }} />
                      <p className="text-2xl font-bold mb-1">{card.value}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{card.label}</p>
                      <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-subtle-fg)' }}>
                        {card.trend}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HIGHLIGHT — WhatsApp + Site
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Visual — chat mockup */}
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 rounded-3xl opacity-15 blur-[60px]" style={{ background: '#22C55E' }} />
              <div className="relative rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                {/* Chat header */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#22C55E20' }}>
                    <MessageSquare size={18} style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Maria Silva</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Online agora</p>
                  </div>
                </div>
                {/* Messages */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ background: 'var(--color-bg-hover)' }}>
                      Ola! Vi o apartamento no Jardins, ainda esta disponivel?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      Ola Maria! Sim, esta disponivel. Posso agendar uma visita para voce esta semana?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ background: 'var(--color-bg-hover)' }}>
                      Quarta-feira a tarde seria perfeito!
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2 max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      <Bot size={14} style={{ opacity: 0.7 }} />
                      Perfeito! Agendei para quarta, 14h. Enviei os detalhes no seu email.
                    </div>
                  </div>
                </div>
                {/* Sentiment badge */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-subtle-fg)' }}>
                    <Sparkles size={12} />
                    Sentimento: Positivo — Lead quente
                  </div>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: '#22C55E15', color: '#4ADE80', border: '1px solid #22C55E30' }}>
                <MessageSquare size={14} />
                WhatsApp + CRM
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                Cada conversa vira oportunidade
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                Todas as mensagens de WhatsApp centralizadas no CRM. Historico completo, deteccao de sentimento por IA e distribuicao automatica para o corretor certo.
              </p>
              <ul className="space-y-3">
                {[
                  'Mensagens bidirecionais em tempo real',
                  'Deteccao de sentimento automatica',
                  'Lead do site vai direto pro CRM e WhatsApp',
                  'Distribuicao inteligente entre corretores',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: '#22C55E' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
              Planos que{' '}
              <span style={{ color: 'var(--color-accent)' }}>cabem no seu bolso</span>
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Sem surpresas. Sem taxas escondidas. Cancele quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className="relative flex flex-col p-6 rounded-2xl transition-all duration-300"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--color-border-subtle)',
                  ...(plan.popular ? { boxShadow: `0 8px 40px ${plan.color}20` } : {}),
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{ background: plan.color, color: '#000' }}
                  >
                    Mais popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>R$</span>
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>/mes</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    ou ${plan.priceUsd}/mes em USD
                  </p>
                </div>

                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6"
                  style={plan.popular
                    ? { background: plan.color, color: '#000' }
                    : { background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)' }
                  }
                  onMouseEnter={e => { if (!plan.popular) e.currentTarget.style.background = 'var(--color-bg-hover)' }}
                  onMouseLeave={e => { if (!plan.popular) e.currentTarget.style.background = 'transparent' }}
                >
                  Comecar agora <ArrowRight size={16} />
                </Link>

                <div className="flex-1 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2.5 text-sm">
                      <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((f, j) => (
                    <div key={j} className="flex items-start gap-2.5 text-sm">
                      <X size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-disabled)' }} />
                      <span style={{ color: 'var(--color-text-disabled)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise CTA */}
          <div className="mt-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Precisa de mais?{' '}
              <a
                href="https://wa.me/5551998388409"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                Fale conosco sobre o plano Enterprise
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 md:py-32" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
              Perguntas frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 transition-transform duration-200"
                    style={{
                      color: 'var(--color-text-tertiary)',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 blur-[100px]" style={{ background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
            Pronto para fechar mais negocios?
          </h2>
          <p className="text-base md:text-lg mb-10" style={{ color: 'var(--color-text-secondary)' }}>
            Junte-se aos corretores e imobiliarias que ja usam IA para vender mais e trabalhar menos.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-bold transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 32px rgba(75,107,251,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Comecar agora <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{ background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Oryen" className="h-7 mb-4" />
              <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                A plataforma completa de CRM, automacao e inteligencia artificial para corretores de imoveis e imobiliarias.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>Produto</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>Funcionalidades</a></li>
                <li><a href="#pricing" className="text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>Planos</a></li>
                <li><a href="#faq" className="text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>FAQ</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>Contato</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://wa.me/5551998388409" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Phone size={14} /> WhatsApp
                  </a>
                </li>
                <li>
                  <a href="mailto:contato@oryen.agency" className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Mail size={14} /> contato@oryen.agency
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
              &copy; {new Date().getFullYear()} Oryen. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
