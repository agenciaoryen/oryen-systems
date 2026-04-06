'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
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
  Star,
  Building2,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// SCROLL ANIMATION HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedValue({ value, suffix = '' }: { value: string; suffix?: string }) {
  const { ref, isVisible } = useInView()
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!isVisible) return
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    const hasK = value.includes('k')
    const duration = 1200
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = num * eased

      if (hasK) {
        setDisplay(current.toFixed(1) + 'k')
      } else if (value.includes('%')) {
        setDisplay(Math.round(current) + '%')
      } else {
        setDisplay(Math.round(current).toLocaleString())
      }

      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [isVisible, value])

  return <span ref={ref}>{display}{suffix}</span>
}

// ═══════════════════════════════════════════════════════════════════════════════
// i18n
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
      cta: 'Começar grátis',
    },
    hero: {
      badge: 'Plataforma com Inteligência Artificial',
      h1_1: 'Você fecha.',
      h1_2: 'A gente cuida',
      h1_3: 'do resto.',
      subtitle: 'CRM, automação e agentes de IA feitos exclusivamente para corretores de imóveis e imobiliárias. Tudo em um só lugar.',
      cta1: 'Começar agora',
      cta2: 'Ver funcionalidades',
      trust1: 'Dados criptografados',
      trust2: 'Setup em 2 minutos',
      trust3: 'Sem instalação',
    },
    features: {
      badge: 'Funcionalidades',
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
      badge: 'Simples de usar',
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
      badge: 'Planos',
      title_1: 'Planos que ',
      title_2: 'cabem no seu bolso',
      subtitle: 'Sem surpresas. Sem taxas escondidas. Cancele quando quiser.',
      popular: 'Mais popular',
      cta: 'Começar agora',
      ctaSecondary: 'Começar grátis',
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
      cta: 'Empezar gratis',
    },
    hero: {
      badge: 'Plataforma con Inteligencia Artificial',
      h1_1: 'Tú cierras.',
      h1_2: 'Nosotros nos encargamos',
      h1_3: 'del resto.',
      subtitle: 'CRM, automatización y agentes de IA hechos exclusivamente para corredores de propiedades e inmobiliarias. Todo en un solo lugar.',
      cta1: 'Empezar ahora',
      cta2: 'Ver funcionalidades',
      trust1: 'Datos encriptados',
      trust2: 'Setup en 2 minutos',
      trust3: 'Sin instalación',
    },
    features: {
      badge: 'Funcionalidades',
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
      badge: 'Fácil de usar',
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
      badge: 'Planes',
      title_1: 'Planes que ',
      title_2: 'caben en tu bolsillo',
      subtitle: 'Sin sorpresas. Sin cargos ocultos. Cancela cuando quieras.',
      popular: 'Más popular',
      cta: 'Empezar ahora',
      ctaSecondary: 'Empezar gratis',
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

const FEATURE_META = [
  { icon: BarChart3, gradient: 'linear-gradient(135deg, #4F6FFF, #6E5FFF)' },
  { icon: Bot, gradient: 'linear-gradient(135deg, #F0A030, #FF8C42)' },
  { icon: MessageSquare, gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
  { icon: Globe, gradient: 'linear-gradient(135deg, #38BDF8, #0284C7)' },
  { icon: FileText, gradient: 'linear-gradient(135deg, #A78BFA, #7C3AED)' },
  { icon: TrendingUp, gradient: 'linear-gradient(135deg, #F472B6, #EC4899)' },
]

const PLAN_POPULAR = [false, true, false]
const CARD_ICONS = [Users, MessageSquare, Phone, TrendingUp]

const STEP_ICONS = [
  { icon: Building2, color: '#4F6FFF' },
  { icon: BarChart3, color: '#6E5FFF' },
  { icon: Zap, color: '#F0A030' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CSS-IN-JS STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  // Gradient border card
  gradientBorder: `
    @keyframes borderRotate {
      0% { --angle: 0deg; }
      100% { --angle: 360deg; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @keyframes typewriter {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .hero-glow {
      animation: pulseGlow 4s ease-in-out infinite;
    }
    .typing-cursor::after {
      content: '|';
      animation: typewriter 1s infinite;
      color: var(--color-primary);
    }
    .gradient-border-animated {
      position: relative;
    }
    .gradient-border-animated::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: var(--gradient-brand);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }
    .feature-card:hover .feature-icon {
      transform: scale(1.1);
    }
    .step-line {
      background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-indigo) 50%, transparent 100%);
    }
    .chat-bubble-in {
      background: var(--color-bg-hover);
      border-radius: 16px 16px 16px 4px;
    }
    .chat-bubble-out {
      background: var(--gradient-brand);
      border-radius: 16px 16px 4px 16px;
      color: #fff;
    }
    .plan-glow {
      box-shadow: 0 0 80px rgba(79, 111, 255, 0.15), 0 0 30px rgba(110, 95, 255, 0.1);
    }
  `,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>('pt')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language?.toLowerCase() || ''
      if (browserLang.startsWith('es')) setLang('es')
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const t = T[lang]
  const isEs = lang === 'es'

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
      <style dangerouslySetInnerHTML={{ __html: styles.gradientBorder }} />

      {/* ═══════════════════════════════════════════════════════════════════
          NAVBAR — Glass effect
          ═══════════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'var(--glass-bg)' : 'transparent',
          backdropFilter: scrolled ? `blur(var(--glass-blur))` : 'none',
          WebkitBackdropFilter: scrolled ? `blur(var(--glass-blur))` : 'none',
          borderBottom: scrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
          boxShadow: scrolled ? 'var(--glass-shadow)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span
                className="text-2xl font-extrabold tracking-widest"
                style={{
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >ORYEN</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                { href: '#features', label: t.nav.features },
                { href: '#how-it-works', label: t.nav.howItWorks },
                { href: '#pricing', label: t.nav.plans },
                { href: '#faq', label: t.nav.faq },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium transition-all duration-150"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setLang(lang === 'pt' ? 'es' : 'pt')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}
              >
                <Globe size={13} />
                {lang === 'pt' ? 'ES' : 'PT'}
              </button>
              <Link
                href="/login"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200"
                style={{
                  background: 'var(--gradient-brand)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(79, 111, 255, 0.25)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(79, 111, 255, 0.4)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(79, 111, 255, 0.25)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {t.nav.cta}
              </Link>
            </div>

            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: 'var(--color-text-secondary)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="pt-3">
                {[
                  { href: '#features', label: t.nav.features },
                  { href: '#how-it-works', label: t.nav.howItWorks },
                  { href: '#pricing', label: t.nav.plans },
                  { href: '#faq', label: t.nav.faq },
                ].map(link => (
                  <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-lg text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="pt-3 flex flex-col gap-2 px-4">
                <button onClick={() => setLang(lang === 'pt' ? 'es' : 'pt')}
                  className="flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg"
                  style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                  <Globe size={14} /> {lang === 'pt' ? 'Español' : 'Português'}
                </button>
                <Link href="/login" className="text-center text-sm font-medium px-4 py-2.5 rounded-lg"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                  {t.nav.login}
                </Link>
                <Link href="/register" className="text-center text-sm font-semibold px-4 py-2.5 rounded-lg"
                  style={{ background: 'var(--gradient-brand)', color: '#fff' }}>
                  {t.nav.cta}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — Glow + Gradient text + Grid background
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-40 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] hero-glow" style={{
          background: 'radial-gradient(ellipse at center, rgba(79, 111, 255, 0.15) 0%, rgba(110, 95, 255, 0.08) 40%, transparent 70%)',
        }} />
        <div className="absolute top-40 right-[10%] w-[300px] h-[300px] rounded-full opacity-20 blur-[100px]" style={{ background: '#6E5FFF' }} />
        <div className="absolute top-60 left-[5%] w-[200px] h-[200px] rounded-full opacity-10 blur-[80px]" style={{ background: '#F0A030' }} />

        {/* Gradient line at the very top */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'var(--gradient-brand)', opacity: 0.3 }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 gradient-border-animated"
              style={{ background: 'var(--color-bg-surface)' }}>
              <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>{t.hero.badge}</span>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] max-w-4xl mx-auto"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-display)' }}
            >
              {t.hero.h1_1}{' '}
              <span className="gradient-text" style={{ backgroundImage: 'var(--gradient-brand-text)' }}>{t.hero.h1_2}</span>{' '}
              {t.hero.h1_3}
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}>
              {t.hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register"
                className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all duration-200"
                style={{
                  background: 'var(--gradient-brand)',
                  color: '#fff',
                  boxShadow: 'var(--shadow-glow)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(79, 111, 255, 0.3), 0 8px 32px rgba(79, 111, 255, 0.25)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-glow)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}>
                {t.hero.cta1}
                <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#features"
                className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium transition-all duration-200"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                  e.currentTarget.style.background = 'rgba(79, 111, 255, 0.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                  e.currentTarget.style.background = 'transparent'
                }}>
                {t.hero.cta2}
                <ChevronDown size={16} className="transition-transform duration-200 group-hover:translate-y-0.5" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                { icon: Shield, label: t.hero.trust1 },
                { icon: Clock, label: t.hero.trust2 },
                { icon: Zap, label: t.hero.trust3 },
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  <item.icon size={14} style={{ color: 'var(--color-primary)', opacity: 0.6 }} />
                  {item.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES — Cards with gradient icon + hover glow
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative py-24 md:py-36">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-[0.06]" style={{
          background: 'radial-gradient(ellipse at center, var(--color-indigo), transparent 70%)',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-subtle-fg)' }}>
                <Star size={12} /> {t.features.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h2)' }}>
                {t.features.title_1}
                <span className="gradient-text" style={{ backgroundImage: 'var(--gradient-brand-text)' }}>{t.features.title_2}</span>
              </h2>
              <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t.features.subtitle}</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.features.items.map((feature: any, i: number) => {
              const Icon = FEATURE_META[i].icon
              const gradient = FEATURE_META[i].gradient
              return (
                <Reveal key={i} delay={i * 80}>
                  <div className="feature-card group relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 h-full"
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}>
                    <div className="feature-icon w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300"
                      style={{ background: gradient }}>
                      <Icon size={20} style={{ color: '#fff' }} />
                    </div>
                    <h3 className="text-base font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{feature.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{feature.description}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS — Numbered steps with connecting line
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-36 relative" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{ background: 'var(--color-indigo-subtle)', color: 'var(--color-indigo-subtle-fg)' }}>
                <Zap size={12} /> {t.howItWorks.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h2)' }}>
                {t.howItWorks.title_1}
                <span className="gradient-text" style={{ backgroundImage: 'var(--gradient-brand-text)' }}>{t.howItWorks.title_2}</span>
              </h2>
              <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t.howItWorks.subtitle}</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-[40px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px"
              style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-indigo), var(--color-accent))' }} />

            {t.howItWorks.steps.map((step: any, i: number) => {
              const StepIcon = STEP_ICONS[i].icon
              return (
                <Reveal key={i} delay={i * 120}>
                  <div className="relative flex flex-col items-center text-center">
                    {/* Number circle */}
                    <div className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300"
                      style={{
                        background: i === 0 ? 'var(--gradient-brand)' : 'var(--color-bg-elevated)',
                        border: i === 0 ? 'none' : '1px solid var(--color-border)',
                        boxShadow: i === 0 ? 'var(--shadow-primary)' : 'none',
                      }}>
                      <StepIcon size={28} style={{ color: i === 0 ? '#fff' : STEP_ICONS[i].color }} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ color: 'var(--color-primary)', letterSpacing: '0.1em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>{step.description}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HIGHLIGHT — IA — Gradient cards with animated values
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.07]" style={{
          background: 'radial-gradient(circle, var(--color-indigo), transparent 70%)',
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                  style={{ background: 'var(--color-indigo-subtle)', color: 'var(--color-indigo-subtle-fg)', border: '1px solid rgba(110, 95, 255, 0.2)' }}>
                  <Bot size={13} /> {t.highlightAi.badge}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h2)' }}>
                  {t.highlightAi.title}
                </h2>
                <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                  {t.highlightAi.subtitle}
                </p>
                <ul className="space-y-4">
                  {t.highlightAi.items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: 'var(--color-indigo-subtle)' }}>
                        <Check size={12} style={{ color: 'var(--color-indigo)' }} />
                      </div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl opacity-30 blur-[80px]"
                style={{ background: 'var(--gradient-brand)' }} />
              <div className="relative grid grid-cols-2 gap-4">
                {t.highlightAi.cards.map((card: any, i: number) => {
                  const Icon = CARD_ICONS[i]
                  return (
                    <Reveal key={i} delay={i * 100}>
                      <div className="relative p-5 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                        {/* Subtle gradient overlay */}
                        <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.04]" style={{
                          background: `radial-gradient(circle at top right, ${i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-indigo)'}, transparent 70%)`
                        }} />
                        <Icon size={18} style={{ color: 'var(--color-indigo)', marginBottom: 12, opacity: 0.7 }} />
                        <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                          <AnimatedValue value={card.value} />
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{card.label}</p>
                        <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-subtle-fg)' }}>
                          {card.trend}
                        </span>
                      </div>
                    </Reveal>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HIGHLIGHT — WhatsApp — Realistic chat
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Chat mockup */}
            <Reveal className="order-2 lg:order-1">
              <div className="relative max-w-md mx-auto lg:mx-0">
                <div className="absolute inset-0 rounded-3xl opacity-10 blur-[60px]" style={{ background: '#22C55E' }} />
                <div className="relative rounded-2xl overflow-hidden"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-5 py-4"
                    style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#22C55E15' }}>
                        <MessageSquare size={18} style={{ color: '#22C55E' }} />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                        style={{ background: '#22C55E', borderColor: 'var(--color-bg-surface)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Maria Silva</p>
                      <p className="text-xs" style={{ color: '#22C55E' }}>{t.highlightWa.chat.online}</p>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="px-4 py-5 space-y-3">
                    <div className="flex justify-start"><div className="chat-bubble-in max-w-[80%] px-4 py-2.5 text-sm">{t.highlightWa.chat.msg1}</div></div>
                    <div className="flex justify-end"><div className="chat-bubble-out max-w-[80%] px-4 py-2.5 text-sm">{t.highlightWa.chat.msg2}</div></div>
                    <div className="flex justify-start"><div className="chat-bubble-in max-w-[80%] px-4 py-2.5 text-sm">{t.highlightWa.chat.msg3}</div></div>
                    <div className="flex justify-end">
                      <div className="chat-bubble-out max-w-[80%] px-4 py-2.5 text-sm flex items-start gap-2">
                        <Bot size={14} className="shrink-0 mt-0.5" style={{ opacity: 0.7 }} />
                        {t.highlightWa.chat.msg4}
                      </div>
                    </div>
                  </div>
                  {/* Sentiment indicator */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                      style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-subtle-fg)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                      <Sparkles size={12} /> {t.highlightWa.chat.sentiment}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Text */}
            <Reveal className="order-1 lg:order-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                  style={{ background: 'rgba(34, 197, 94, 0.08)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <MessageSquare size={13} /> {t.highlightWa.badge}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h2)' }}>
                  {t.highlightWa.title}
                </h2>
                <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                  {t.highlightWa.subtitle}
                </p>
                <ul className="space-y-4">
                  {t.highlightWa.items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <Check size={12} style={{ color: '#22C55E' }} />
                      </div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING — Gradient border on popular plan
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 md:py-36 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-[0.05]" style={{
          background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-subtle-fg)' }}>
                <Star size={12} /> {t.pricing.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h2)' }}>
                {t.pricing.title_1}
                <span className="gradient-text" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-accent), #FF8C42)' }}>{t.pricing.title_2}</span>
              </h2>
              <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t.pricing.subtitle}</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
            {t.pricing.plans.map((plan: any, i: number) => {
              const popular = PLAN_POPULAR[i]
              return (
                <Reveal key={i} delay={i * 100}>
                  <div className={`relative flex flex-col rounded-2xl transition-all duration-300 ${popular ? 'plan-glow gradient-border-animated md:-mt-4 md:mb-[-16px]' : ''}`}
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: popular ? 'none' : '1px solid var(--color-border)',
                      padding: popular ? '2px' : '0',
                    }}>
                    {popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                        <span className="px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                          style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 12px rgba(79, 111, 255, 0.3)' }}>
                          {t.pricing.popular}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col h-full ${popular ? 'rounded-[14px] p-6' : 'p-6'}`}
                      style={{ background: popular ? 'var(--color-bg-surface)' : 'transparent' }}>
                      <div className="mb-6">
                        <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{plan.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{plan.description}</p>
                      </div>
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{isEs ? '$' : 'R$'}</span>
                          <span className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{plan.price}</span>
                          <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.pricing.perMonth}</span>
                        </div>
                        {!isEs && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.pricing.orUsd} ${plan.priceUsd}{t.pricing.usdSuffix}
                          </p>
                        )}
                      </div>
                      <Link href="/register"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 mb-6"
                        style={popular
                          ? { background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(79, 111, 255, 0.25)' }
                          : { background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)' }}
                        onMouseEnter={e => {
                          if (popular) {
                            e.currentTarget.style.boxShadow = '0 6px 24px rgba(79, 111, 255, 0.35)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          } else {
                            e.currentTarget.style.background = 'var(--color-bg-hover)'
                            e.currentTarget.style.borderColor = 'var(--color-primary)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (popular) {
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(79, 111, 255, 0.25)'
                            e.currentTarget.style.transform = 'translateY(0)'
                          } else {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                          }
                        }}>
                        {popular ? t.pricing.cta : t.pricing.ctaSecondary}
                        <ArrowRight size={15} />
                      </Link>
                      <div className="flex-1 space-y-2.5">
                        {plan.features.map((f: string, j: number) => (
                          <div key={j} className="flex items-start gap-2.5 text-sm">
                            <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
                            <span style={{ color: 'var(--color-text-secondary)' }}>{f}</span>
                          </div>
                        ))}
                        {plan.notIncluded.map((f: string, j: number) => (
                          <div key={`no-${j}`} className="flex items-start gap-2.5 text-sm">
                            <X size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-disabled)' }} />
                            <span style={{ color: 'var(--color-text-disabled)' }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal>
            <div className="mt-12 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                {t.pricing.enterprise}{' '}
                <a href="https://wa.me/5551998388409" target="_blank" rel="noopener noreferrer"
                  className="font-medium underline transition-colors duration-150"
                  style={{ color: 'var(--color-primary)' }}>
                  {t.pricing.enterpriseLink}
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FAQ — Clean accordion
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 md:py-36" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h2)' }}>
                {t.faq.title}
              </h2>
            </div>
          </Reveal>
          <div className="space-y-3">
            {t.faq.items.map((faq: any, i: number) => (
              <Reveal key={i} delay={i * 60}>
                <div className="rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    background: openFaq === i ? 'var(--color-bg-elevated)' : 'transparent',
                    border: `1px solid ${openFaq === i ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
                  }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left group">
                    <span className="font-medium text-sm pr-4">{faq.q}</span>
                    <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                      style={{ background: openFaq === i ? 'var(--color-primary-subtle)' : 'transparent' }}>
                      <ChevronDown
                        size={16}
                        className="transition-transform duration-200"
                        style={{
                          color: openFaq === i ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                          transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </div>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-200"
                    style={{
                      maxHeight: openFaq === i ? '200px' : '0',
                      opacity: openFaq === i ? 1 : 0,
                    }}
                  >
                    <div className="px-5 pb-5">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA — Full gradient section
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0" style={{ background: 'var(--gradient-brand-subtle)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-10" style={{
          background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--gradient-brand)', opacity: 0.2 }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-h1)' }}>
              {t.finalCta.title}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-base md:text-lg mb-10" style={{ color: 'var(--color-text-secondary)' }}>
              {t.finalCta.subtitle}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <Link href="/register"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-bold transition-all duration-200"
              style={{
                background: 'var(--gradient-brand)',
                color: '#fff',
                boxShadow: '0 0 60px rgba(79, 111, 255, 0.2), 0 8px 32px rgba(79, 111, 255, 0.25)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 80px rgba(79, 111, 255, 0.3), 0 12px 40px rgba(79, 111, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 0 60px rgba(79, 111, 255, 0.2), 0 8px 32px rgba(79, 111, 255, 0.25)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              {t.finalCta.cta}
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{ background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span
                className="text-xl font-extrabold tracking-widest mb-4 inline-block"
                style={{
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >ORYEN</span>
              <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                {t.footer.description}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>
                {t.footer.product}
              </h4>
              <ul className="space-y-2.5">
                {[
                  { href: '#features', label: t.nav.features },
                  { href: '#pricing', label: t.nav.plans },
                  { href: '#faq', label: t.nav.faq },
                ].map((link, i) => (
                  <li key={i}>
                    <a href={link.href} className="text-sm transition-colors duration-150"
                      style={{ color: 'var(--color-text-tertiary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>
                {t.footer.contact}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://wa.me/5551998388409" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-colors duration-150"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                    <Phone size={14} /> WhatsApp
                  </a>
                </li>
                <li>
                  <a href="mailto:contato@oryen.agency"
                    className="flex items-center gap-2 text-sm transition-colors duration-150"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                    <Mail size={14} /> contato@oryen.agency
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
              &copy; {new Date().getFullYear()} Oryen. {t.footer.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
