// lib/agents/profiles.ts
// Human profiles for AI agents — display names, avatars, and roles
// Photos in /public/agents/ — generated via AI, consistent headshot style

export interface AgentProfile {
  slug: string
  displayName: string
  avatarUrl: string
  role: Record<string, string> // {pt, en, es}
}

const T: Record<string, AgentProfile> = {
  sdr_imobiliario: {
    slug: 'sdr_imobiliario',
    displayName: 'Sofia',
    avatarUrl: '/agents/sofia.png',
    role: {
      pt: 'Especialista em Qualificação',
      en: 'Qualification Specialist',
      es: 'Especialista en Calificación',
    },
  },
  sdr: {
    slug: 'sdr',
    displayName: 'Sofia',
    avatarUrl: '/agents/sofia.png',
    role: {
      pt: 'Especialista em Qualificação',
      en: 'Qualification Specialist',
      es: 'Especialista en Calificación',
    },
  },
  followup_imobiliario: {
    slug: 'followup_imobiliario',
    displayName: 'Rafael',
    avatarUrl: '/agents/rafael.png',
    role: {
      pt: 'Especialista em Relacionamento',
      en: 'Relationship Specialist',
      es: 'Especialista en Relaciones',
    },
  },
  followup: {
    slug: 'followup',
    displayName: 'Rafael',
    avatarUrl: '/agents/rafael.png',
    role: {
      pt: 'Especialista em Relacionamento',
      en: 'Relationship Specialist',
      es: 'Especialista en Relaciones',
    },
  },
  bdr_email: {
    slug: 'bdr_email',
    displayName: 'Helena',
    avatarUrl: '/agents/helena.png',
    role: {
      pt: 'Especialista em Prospecção B2B',
      en: 'B2B Prospecting Specialist',
      es: 'Especialista en Prospección B2B',
    },
  },
  hunter_b2b: {
    slug: 'hunter_b2b',
    displayName: 'Vicente',
    avatarUrl: '/agents/vicente.png',
    role: {
      pt: 'Especialista em Captação',
      en: 'Acquisition Specialist',
      es: 'Especialista en Captación',
    },
  },
  coach: {
    slug: 'coach',
    displayName: 'Augusto',
    avatarUrl: '/agents/augusto.png',
    role: {
      pt: 'Mentor Pessoal de Negócios',
      en: 'Personal Business Mentor',
      es: 'Mentor Personal de Negocios',
    },
  },
}

export function getAgentProfile(slug: string): AgentProfile | undefined {
  return T[slug]
}

export const COACH_PROFILE = T.coach
