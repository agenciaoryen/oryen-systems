'use client'

import { useState, useEffect } from 'react'
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
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS & i18n
// ═══════════════════════════════════════════════════════════════════════════════

type Lang = 'pt' | 'es'

const T: Record<Lang, Record<string, any>> = {
  pt: {
    nav: {
      features: 'Funcionalidades',
      howItWorks: 'Como funciona',
      plans: 'Planos',
      faq: 'FAQ',
      login: 'Entrar',
      cta: 'Começar agora',
    },
    hero: {
      badge: 'Plataforma com Inteligência Artificial',
      h1_1: 'Você fecha.',
      h1_2: 'A gente cuida',
      h1_3: 'do resto.',
      subtitle: 'CRM, automação e agentes de IA feitos exclusivamente para corretores de imóveis e imobiliárias. Tudo em um só lugar.',
      cta1: 'Começar agora',
      cta2: 'Ver planos',
      trust1: 'Dados criptografados',
      trust2: 'Setup em 2 minutos',
      trust3: 'Sem instalação',
    },
    features: {
      title_1: 'Tudo que você precisa para ',
      title_2: 'vender mais',
      subtitle: 'Uma plataforma completa que substitui dezenas de ferramentas. Do primeiro contato ao fechamento.',
      items: [
        { title: 'CRM Imobiliário', description: 'Pipeline visual com etapas do mercado imobiliário. Arraste e solte leads entre fases como Novo Lead, Visita Agendada, Proposta e Fechamento.' },
        { title: 'Agentes de IA', description: 'SDR e Hunter automatizam prospecção e qualificação de leads. Seus agentes trabalham 24h enviando mensagens e agendando visitas.' },
        { title: 'WhatsApp Integrado', description: 'Atendimento bidirecional direto no sistema. Histórico completo de conversas, detecção de sentimento e respostas rápidas.' },
        { title: 'Site de Imóveis', description: 'Portfólio online profissional gerado automaticamente. Formulário de contato integrado ao CRM com distribuição automática de leads.' },
        { title: 'Documentos Inteligentes', description: 'Propostas e contratos com templates personalizáveis. Gere PDFs, envie por e-mail ou WhatsApp e acompanhe o ciclo de assinatura.' },
        { title: 'Dashboard e Relatórios', description: 'KPIs em tempo real, gráficos de conversão e relatórios automatizados. Saiba exatamente o desempenho da sua operação.' },
      ],
    },
    howItWorks: {
      title_1: 'Comece em ',
      title_2: '3 passos',
      subtitle: 'Do cadastro ao primeiro lead qualificado em minutos, não semanas.',
      steps: [
        { title: 'Crie sua conta', description: 'Cadastre-se, configure sua empresa e escolha o plano ideal em menos de 2 minutos.' },
        { title: 'Configure seu pipeline', description: 'Pipeline padrão para o mercado imobiliário já vem pronto. Personalize etapas, tags e equipe.' },
        { title: 'Feche mais negócios', description: 'Deixe os agentes de IA prospectar e qualificar enquanto você foca no que importa: fechar.' },
      ],
    },
    highlightAi: {
      badge: 'Inteligência Artificial',
      title: 'Seus agentes trabalham enquanto você dorme',
      subtitle: 'Os agentes de IA do Oryen prospectam novos leads, qualificam contatos e agendam visitas automaticamente. Você acorda com leads quentes prontos para fechar.',
      items: [
        'SDR automatiza o primeiro contato via WhatsApp',
        'Hunter encontra novos prospects no seu mercado',
        'Qualificação inteligente baseada em comportamento',
        'Agendamento automático de visitas',
      ],
      cards: [
        { label: 'Leads Qualificados', value: '847', trend: '+23%' },
        { label: 'Mensagens Enviadas', value: '12.4k', trend: '+18%' },
        { label: 'Visitas Agendadas', value: '156', trend: '+31%' },
        { label: 'Taxa de Conversão', value: '34%', trend: '+5%' },
      ],
    },
    highlightWa: {
      badge: 'WhatsApp + CRM',
      title: 'Cada conversa vira oportunidade',
      subtitle: 'Todas as mensagens de WhatsApp centralizadas no CRM. Histórico completo, detecção de sentimento por IA e distribuição automática para o corretor certo.',
      items: [
        'Mensagens bidirecionais em tempo real',
        'Detecção de sentimento automática',
        'Lead do site vai direto pro CRM e WhatsApp',
        'Distribuição inteligente entre corretores',
      ],
      chat: {
        online: 'Online agora',
        msg1: 'Olá! Vi o apartamento no Jardins, ainda está disponível?',
        msg2: 'Olá Maria! Sim, está disponível. Posso agendar uma visita para você esta semana?',
        msg3: 'Quarta-feira à tarde seria perfeito!',
        msg4: 'Perfeito! Agendei para quarta, 14h. Enviei os detalhes no seu e-mail.',
        sentiment: 'Sentimento: Positivo — Lead quente',
      },
    },
    pricing: {
      title_1: 'Planos que ',
      title_2: 'cabem no seu bolso',
      subtitle: 'Sem surpresas. Sem taxas escondidas. Cancele quando quiser.',
      popular: 'Mais popular',
      cta: 'Começar agora',
      perMonth: '/mês',
      orUsd: 'ou',
      usdSuffix: '/mês em USD',
      enterprise: 'Precisa de mais?',
      enterpriseLink: 'Fale conosco sobre o plano Enterprise',
      plans: [
        {
          name: 'Basic', price: 97, priceUsd: 19, description: 'Para corretores autônomos',
          features: ['1 usuário', 'Até 1.000 leads ativos', 'CRM com pipeline visual', 'WhatsApp (1 número)', 'Site de imóveis', 'Documentos e templates'],
          notIncluded: ['Agentes de IA', 'Automações', 'Relatórios avançados'],
        },
        {
          name: 'Gold', price: 1097, priceUsd: 219, description: 'Para equipes em crescimento',
          features: ['Até 5 usuários', 'Até 5.000 leads ativos', 'Tudo do Basic +', 'Agentes de IA (SDR + Hunter)', 'Automações inteligentes', 'WhatsApp oficial (5 números)', 'Relatórios e dashboard avançado', '10.000 mensagens IA/mês'],
          notIncluded: ['API e integrações avançadas', 'Campanhas em massa'],
        },
        {
          name: 'Diamond', price: 1647, priceUsd: 329, description: 'Para imobiliárias completas',
          features: ['Até 15 usuários', 'Até 10.000 leads ativos', 'Tudo do Gold +', 'API e integrações avançadas', 'Campanhas em massa', 'WhatsApp oficial (15 números)', 'Suporte prioritário', '50.000 mensagens IA/mês'],
          notIncluded: [],
        },
      ],
    },
    faq: {
      title: 'Perguntas frequentes',
      items: [
        { q: 'Preciso instalar alguma coisa?', a: 'Não. O Oryen é 100% na nuvem. Funciona no navegador do computador ou celular, sem instalação.' },
        { q: 'Posso testar antes de pagar?', a: 'Oferecemos um período de demonstração para você conhecer a plataforma. Entre em contato com nosso time para agendar.' },
        { q: 'Como funciona a integração com WhatsApp?', a: 'Você conecta seu número de WhatsApp diretamente no painel. Todas as mensagens chegam no sistema em tempo real, com histórico completo e detecção de sentimento.' },
        { q: 'Os agentes de IA substituem minha equipe?', a: 'Não. Os agentes automatizam tarefas repetitivas como prospecção e qualificação, liberando sua equipe para focar no atendimento personalizado e fechamento.' },
        { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem fidelidade e sem multa. Você pode fazer upgrade, downgrade ou cancelar direto no painel de configurações.' },
        { q: 'O site de imóveis substitui meu site atual?', a: 'Ele pode ser seu site principal ou complementar. É um site profissional gerado automaticamente a partir do seu portfólio, com domínio personalizado e formulário integrado ao CRM.' },
      ],
    },
    finalCta: {
      title: 'Pronto para fechar mais negócios?',
      subtitle: 'Junte-se aos corretores e imobiliárias que já usam IA para vender mais e trabalhar menos.',
      cta: 'Começar agora',
    },
    footer: {
      description: 'A plataforma completa de CRM, automação e inteligência artificial para corretores de imóveis e imobiliárias.',
      product: 'Produto',
      contact: 'Contato',
      rights: 'Todos os direitos reservados.',
    },
  },

  es: {
    nav: {
      features: 'Funcionalidades',
      howItWorks: 'Cómo funciona',
      plans: 'Planes',
      faq: 'FAQ',
      login: 'Ingresar',
      cta: 'Empezar ahora',
    },
    hero: {
      badge: 'Plataforma con Inteligencia Artificial',
      h1_1: 'Tú cierras.',
      h1_2: 'Nosotros nos encargamos',
      h1_3: 'del resto.',
      subtitle: 'CRM, automatización y agentes de IA hechos exclusivamente para corredores de propiedades e inmobiliarias. Todo en un solo lugar.',
      cta1: 'Empezar ahora',
      cta2: 'Ver planes',
      trust1: 'Datos encriptados',
      trust2: 'Setup en 2 minutos',
      trust3: 'Sin instalación',
    },
    features: {
      title_1: 'Todo lo que necesitas para ',
      title_2: 'vender más',
      subtitle: 'Una plataforma completa que reemplaza decenas de herramientas. Desde el primer contacto hasta el cierre.',
      items: [
        { title: 'CRM Inmobiliario', description: 'Pipeline visual con etapas del mercado inmobiliario. Arrastra y suelta leads entre fases como Nuevo Lead, Visita Agendada, Propuesta y Cierre.' },
        { title: 'Agentes de IA', description: 'SDR y Hunter automatizan la prospección y calificación de leads. Tus agentes trabajan 24h enviando mensajes y agendando visitas.' },
        { title: 'WhatsApp Integrado', description: 'Atención bidireccional directo en el sistema. Historial completo de conversaciones, detección de sentimiento y respuestas rápidas.' },
        { title: 'Sitio de Propiedades', description: 'Portafolio online profesional generado automáticamente. Formulario de contacto integrado al CRM con distribución automática de leads.' },
        { title: 'Documentos Inteligentes', description: 'Propuestas y contratos con plantillas personalizables. Genera PDFs, envía por email o WhatsApp y sigue el ciclo de firma.' },
        { title: 'Dashboard y Reportes', description: 'KPIs en tiempo real, gráficos de conversión y reportes automatizados. Conoce exactamente el rendimiento de tu operación.' },
      ],
    },
    howItWorks: {
      title_1: 'Empieza en ',
      title_2: '3 pasos',
      subtitle: 'Del registro al primer lead calificado en minutos, no semanas.',
      steps: [
        { title: 'Crea tu cuenta', description: 'Regístrate, configura tu empresa y elige el plan ideal en menos de 2 minutos.' },
        { title: 'Configura tu pipeline', description: 'Pipeline predeterminado para el mercado inmobiliario ya viene listo. Personaliza etapas, tags y equipo.' },
        { title: 'Cierra más negocios', description: 'Deja que los agentes de IA prospecten y califiquen mientras tú te enfocas en lo que importa: cerrar.' },
      ],
    },
    highlightAi: {
      badge: 'Inteligencia Artificial',
      title: 'Tus agentes trabajan mientras tú duermes',
      subtitle: 'Los agentes de IA de Oryen prospectan nuevos leads, califican contactos y agendan visitas automáticamente. Despiertas con leads calientes listos para cerrar.',
      items: [
        'SDR automatiza el primer contacto vía WhatsApp',
        'Hunter encuentra nuevos prospectos en tu mercado',
        'Calificación inteligente basada en comportamiento',
        'Agendamiento automático de visitas',
      ],
      cards: [
        { label: 'Leads Calificados', value: '847', trend: '+23%' },
        { label: 'Mensajes Enviados', value: '12.4k', trend: '+18%' },
        { label: 'Visitas Agendadas', value: '156', trend: '+31%' },
        { label: 'Tasa de Conversión', value: '34%', trend: '+5%' },
      ],
    },
    highlightWa: {
      badge: 'WhatsApp + CRM',
      title: 'Cada conversación se convierte en oportunidad',
      subtitle: 'Todos los mensajes de WhatsApp centralizados en el CRM. Historial completo, detección de sentimiento por IA y distribución automática al corredor indicado.',
      items: [
        'Mensajes bidireccionales en tiempo real',
        'Detección de sentimiento automática',
        'Lead del sitio va directo al CRM y WhatsApp',
        'Distribución inteligente entre corredores',
      ],
      chat: {
        online: 'En línea ahora',
        msg1: '¡Hola! Vi el departamento en Las Condes, ¿sigue disponible?',
        msg2: '¡Hola María! Sí, está disponible. ¿Puedo agendar una visita para esta semana?',
        msg3: '¡El miércoles por la tarde sería perfecto!',
        msg4: '¡Perfecto! Agendé para el miércoles, 14h. Envié los detalles a tu email.',
        sentiment: 'Sentimiento: Positivo — Lead caliente',
      },
    },
    pricing: {
      title_1: 'Planes que ',
      title_2: 'caben en tu bolsillo',
      subtitle: 'Sin sorpresas. Sin cargos ocultos. Cancela cuando quieras.',
      popular: 'Más popular',
      cta: 'Empezar ahora',
      perMonth: '/mes',
      orUsd: 'o',
      usdSuffix: '/mes en USD',
      enterprise: '¿Necesitas más?',
      enterpriseLink: 'Habla con nosotros sobre el plan Enterprise',
      plans: [
        {
          name: 'Basic', price: 19, priceUsd: 19, description: 'Para corredores independientes',
          features: ['1 usuario', 'Hasta 1.000 leads activos', 'CRM con pipeline visual', 'WhatsApp (1 número)', 'Sitio de propiedades', 'Documentos y plantillas'],
          notIncluded: ['Agentes de IA', 'Automatizaciones', 'Reportes avanzados'],
        },
        {
          name: 'Gold', price: 219, priceUsd: 219, description: 'Para equipos en crecimiento',
          features: ['Hasta 5 usuarios', 'Hasta 5.000 leads activos', 'Todo de Basic +', 'Agentes de IA (SDR + Hunter)', 'Automatizaciones inteligentes', 'WhatsApp oficial (5 números)', 'Reportes y dashboard avanzado', '10.000 mensajes IA/mes'],
          notIncluded: ['API e integraciones avanzadas', 'Campañas masivas'],
        },
        {
          name: 'Diamond', price: 329, priceUsd: 329, description: 'Para inmobiliarias completas',
          features: ['Hasta 15 usuarios', 'Hasta 10.000 leads activos', 'Todo de Gold +', 'API e integraciones avanzadas', 'Campañas masivas', 'WhatsApp oficial (15 números)', 'Soporte prioritario', '50.000 mensajes IA/mes'],
          notIncluded: [],
        },
      ],
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { q: '¿Necesito instalar algo?', a: 'No. Oryen es 100% en la nube. Funciona en el navegador de tu computadora o celular, sin instalación.' },
        { q: '¿Puedo probar antes de pagar?', a: 'Ofrecemos un período de demostración para que conozcas la plataforma. Contacta a nuestro equipo para agendar.' },
        { q: '¿Cómo funciona la integración con WhatsApp?', a: 'Conectas tu número de WhatsApp directamente en el panel. Todos los mensajes llegan al sistema en tiempo real, con historial completo y detección de sentimiento.' },
        { q: '¿Los agentes de IA reemplazan a mi equipo?', a: 'No. Los agentes automatizan tareas repetitivas como prospección y calificación, liberando a tu equipo para enfocarse en la atención personalizada y el cierre.' },
        { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin permanencia y sin multa. Puedes hacer upgrade, downgrade o cancelar directo en el panel de configuración.' },
        { q: '¿El sitio de propiedades reemplaza mi sitio actual?', a: 'Puede ser tu sitio principal o complementario. Es un sitio profesional generado automáticamente a partir de tu portafolio, con dominio personalizado y formulario integrado al CRM.' },
      ],
    },
    finalCta: {
      title: '¿Listo para cerrar más negocios?',
      subtitle: 'Únete a los corredores e inmobiliarias que ya usan IA para vender más y trabajar menos.',
      cta: 'Empezar ahora',
    },
    footer: {
      description: 'La plataforma completa de CRM, automatización e inteligencia artificial para corredores de propiedades e inmobiliarias.',
      product: 'Producto',
      contact: 'Contacto',
      rights: 'Todos los derechos reservados.',
    },
  },
}

// Ícones e cores dos features (compartilhados entre idiomas)
const FEATURE_META = [
  { icon: BarChart3, color: 'var(--color-primary)' },
  { icon: Bot, color: 'var(--color-accent)' },
  { icon: MessageSquare, color: '#22C55E' },
  { icon: Globe, color: '#38BDF8' },
  { icon: FileText, color: '#A78BFA' },
  { icon: TrendingUp, color: '#F472B6' },
]

const PLAN_COLORS = ['var(--color-primary)', 'var(--color-accent)', '#A78BFA']
const PLAN_POPULAR = [false, true, false]

const CARD_ICONS = [Users, MessageSquare, Phone, TrendingUp]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>('pt')

  // Auto-detect idioma do navegador
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language?.toLowerCase() || ''
      if (browserLang.startsWith('es')) setLang('es')
    }
  }, [])

  const t = T[lang]
  const isEs = lang === 'es'

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
              {[
                { href: '#features', label: t.nav.features },
                { href: '#how-it-works', label: t.nav.howItWorks },
                { href: '#pricing', label: t.nav.plans },
                { href: '#faq', label: t.nav.faq },
              ].map(link => (
                <a key={link.href} href={link.href} className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA + Lang */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language switcher */}
              <button
                onClick={() => setLang(lang === 'pt' ? 'es' : 'pt')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }}
                title={lang === 'pt' ? 'Cambiar a Español' : 'Mudar para Português'}
              >
                <Globe size={14} />
                {lang === 'pt' ? 'ES' : 'PT'}
              </button>
              <Link
                href="/login"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
              >
                {t.nav.cta}
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
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.nav.features}</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.nav.howItWorks}</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.nav.plans}</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.nav.faq}</a>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => setLang(lang === 'pt' ? 'es' : 'pt')} className="flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                  <Globe size={14} /> {lang === 'pt' ? 'Español' : 'Português'}
                </button>
                <Link href="/login" className="text-center text-sm px-4 py-2.5 rounded-lg" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>{t.nav.login}</Link>
                <Link href="/register" className="text-center text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ background: 'var(--color-primary)', color: '#fff' }}>{t.nav.cta}</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20 blur-[120px]" style={{ background: 'var(--color-primary)' }} />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]" style={{ background: 'var(--color-accent)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-subtle-fg)', border: '1px solid rgba(75,107,251,0.2)' }}>
            <Sparkles size={14} />
            {t.hero.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
            {t.hero.h1_1}{' '}
            <span style={{ color: 'var(--color-primary)' }}>{t.hero.h1_2}</span>{' '}
            {t.hero.h1_3}
          </h1>

          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t.hero.subtitle}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 32px rgba(75,107,251,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              {t.hero.cta1}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#pricing"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium transition-all"
              style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
              {t.hero.cta2}
            </a>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            <span className="flex items-center gap-2"><Shield size={14} /> {t.hero.trust1}</span>
            <span className="flex items-center gap-2"><Clock size={14} /> {t.hero.trust2}</span>
            <span className="flex items-center gap-2"><Zap size={14} /> {t.hero.trust3}</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
              {t.features.title_1}
              <span style={{ color: 'var(--color-accent)' }}>{t.features.title_2}</span>
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t.features.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.items.map((feature: any, i: number) => {
              const Icon = FEATURE_META[i].icon
              const color = FEATURE_META[i].color
              return (
                <div key={i} className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-subtle)')}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{feature.description}</p>
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
              {t.howItWorks.title_1}
              <span style={{ color: 'var(--color-primary)' }}>{t.howItWorks.title_2}</span>
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t.howItWorks.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {t.howItWorks.steps.map((step: any, i: number) => (
              <div key={i} className="text-center md:text-left">
                <div className="inline-flex text-3xl font-bold mb-4" style={{ color: 'var(--color-primary)', opacity: 0.5, fontFamily: 'var(--font-plus-jakarta)' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HIGHLIGHT — IA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-subtle-fg)' }}>
                <Bot size={14} /> {t.highlightAi.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>{t.highlightAi.title}</h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>{t.highlightAi.subtitle}</p>
              <ul className="space-y-3">
                {t.highlightAi.items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl opacity-20 blur-[60px]" style={{ background: 'var(--color-accent)' }} />
              <div className="relative grid grid-cols-2 gap-4">
                {t.highlightAi.cards.map((card: any, i: number) => {
                  const Icon = CARD_ICONS[i]
                  return (
                    <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                      <Icon size={18} style={{ color: 'var(--color-accent)', marginBottom: 12 }} />
                      <p className="text-2xl font-bold mb-1">{card.value}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{card.label}</p>
                      <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-subtle-fg)' }}>{card.trend}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HIGHLIGHT — WhatsApp
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Chat mockup */}
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 rounded-3xl opacity-15 blur-[60px]" style={{ background: '#22C55E' }} />
              <div className="relative rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#22C55E20' }}>
                    <MessageSquare size={18} style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Maria Silva</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.highlightWa.chat.online}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ background: 'var(--color-bg-hover)' }}>{t.highlightWa.chat.msg1}</div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm" style={{ background: 'var(--color-primary)', color: '#fff' }}>{t.highlightWa.chat.msg2}</div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ background: 'var(--color-bg-hover)' }}>{t.highlightWa.chat.msg3}</div>
                  </div>
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2 max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      <Bot size={14} style={{ opacity: 0.7 }} /> {t.highlightWa.chat.msg4}
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-subtle-fg)' }}>
                    <Sparkles size={12} /> {t.highlightWa.chat.sentiment}
                  </div>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: '#22C55E15', color: '#4ADE80', border: '1px solid #22C55E30' }}>
                <MessageSquare size={14} /> {t.highlightWa.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>{t.highlightWa.title}</h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>{t.highlightWa.subtitle}</p>
              <ul className="space-y-3">
                {t.highlightWa.items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: '#22C55E' }} /> {item}
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
              {t.pricing.title_1}
              <span style={{ color: 'var(--color-accent)' }}>{t.pricing.title_2}</span>
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t.pricing.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {t.pricing.plans.map((plan: any, i: number) => {
              const color = PLAN_COLORS[i]
              const popular = PLAN_POPULAR[i]
              return (
                <div key={i} className="relative flex flex-col p-6 rounded-2xl transition-all duration-300"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: popular ? `2px solid ${color}` : '1px solid var(--color-border-subtle)',
                    ...(popular ? { boxShadow: `0 8px 40px ${color}20` } : {}),
                  }}>
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: color, color: '#000' }}>
                      {t.pricing.popular}
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{isEs ? '$' : 'R$'}</span>
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.pricing.perMonth}</span>
                    </div>
                    {!isEs && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.pricing.orUsd} ${plan.priceUsd}{t.pricing.usdSuffix}
                      </p>
                    )}
                  </div>
                  <Link href="/register"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6"
                    style={popular ? { background: color, color: '#000' } : { background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)' }}
                    onMouseEnter={e => { if (!popular) e.currentTarget.style.background = 'var(--color-bg-hover)' }}
                    onMouseLeave={e => { if (!popular) e.currentTarget.style.background = 'transparent' }}>
                    {t.pricing.cta} <ArrowRight size={16} />
                  </Link>
                  <div className="flex-1 space-y-2.5">
                    {plan.features.map((f: string, j: number) => (
                      <div key={j} className="flex items-start gap-2.5 text-sm">
                        <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((f: string, j: number) => (
                      <div key={j} className="flex items-start gap-2.5 text-sm">
                        <X size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-disabled)' }} />
                        <span style={{ color: 'var(--color-text-disabled)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.pricing.enterprise}{' '}
              <a href="https://wa.me/5551998388409" target="_blank" rel="noopener noreferrer" className="font-medium underline transition-colors" style={{ color: 'var(--color-primary)' }}>
                {t.pricing.enterpriseLink}
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>{t.faq.title}</h2>
          </div>
          <div className="space-y-3">
            {t.faq.items.map((faq: any, i: number) => (
              <div key={i} className="rounded-xl overflow-hidden transition-all" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronDown size={18} className="shrink-0 transition-transform duration-200" style={{ color: 'var(--color-text-tertiary)', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{faq.a}</p>
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>{t.finalCta.title}</h2>
          <p className="text-base md:text-lg mb-10" style={{ color: 'var(--color-text-secondary)' }}>{t.finalCta.subtitle}</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-bold transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 32px rgba(75,107,251,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            {t.finalCta.cta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{ background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Oryen" className="h-7 mb-4" />
              <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>{t.footer.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>{t.footer.product}</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>{t.nav.features}</a></li>
                <li><a href="#pricing" className="text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>{t.nav.plans}</a></li>
                <li><a href="#faq" className="text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>{t.nav.faq}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>{t.footer.contact}</h4>
              <ul className="space-y-2.5">
                <li><a href="https://wa.me/5551998388409" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}><Phone size={14} /> WhatsApp</a></li>
                <li><a href="mailto:contato@oryen.agency" className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}><Mail size={14} /> contato@oryen.agency</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>&copy; {new Date().getFullYear()} Oryen. {t.footer.rights}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
