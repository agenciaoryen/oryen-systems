// lib/addons.ts
// Definição e lógica de add-ons — extras compráveis além do plano base
//
// Tabela Supabase necessária: org_addons
// CREATE TABLE org_addons (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
//   addon_type TEXT NOT NULL,          -- 'extra_users' | 'extra_messages' | 'extra_whatsapp' | 'extra_sites'
//   quantity INT NOT NULL DEFAULT 1,   -- quantas unidades comprou
//   stripe_subscription_id TEXT,       -- subscription do Stripe (mensal)
//   status TEXT DEFAULT 'active',      -- 'active' | 'canceled'
//   created_at TIMESTAMPTZ DEFAULT now(),
//   updated_at TIMESTAMPTZ DEFAULT now()
// );
// CREATE INDEX idx_org_addons_org ON org_addons(org_id);

export type AddonType = 'extra_users' | 'extra_messages' | 'extra_whatsapp' | 'extra_sites'

export interface AddonConfig {
  type: AddonType
  displayName: string
  description: string
  unitLabel: string
  unitAmount: number           // quanto cada unidade adiciona ao limite
  priceUsd: number             // preço mensal por unidade (USD)
  priceBrl: number             // preço mensal por unidade (BRL)
  limitKey: string             // qual campo do PlanLimits este addon expande
  icon: string                 // nome do ícone Lucide
}

export const ADDON_CONFIGS: Record<AddonType, AddonConfig> = {
  extra_users: {
    type: 'extra_users',
    displayName: 'Usuários Extras',
    description: 'Adicione mais membros à sua equipe',
    unitLabel: 'usuário',
    unitAmount: 1,
    priceUsd: 15,
    priceBrl: 75,
    limitKey: 'maxUsers',
    icon: 'Users',
  },
  extra_messages: {
    type: 'extra_messages',
    displayName: 'Mensagens IA Extras',
    description: 'Mais mensagens de IA por mês para o SDR',
    unitLabel: '2.000 mensagens',
    unitAmount: 2000,
    priceUsd: 25,
    priceBrl: 125,
    limitKey: 'maxMonthlyMessages',
    icon: 'MessageSquare',
  },
  extra_whatsapp: {
    type: 'extra_whatsapp',
    displayName: 'WhatsApp Extra',
    description: 'Conecte mais números de WhatsApp',
    unitLabel: 'número',
    unitAmount: 1,
    priceUsd: 12,
    priceBrl: 60,
    limitKey: 'maxWhatsappNumbers',
    icon: 'Phone',
  },
  extra_sites: {
    type: 'extra_sites',
    displayName: 'Site Extra',
    description: 'Crie mais sites para seus imóveis',
    unitLabel: 'site',
    unitAmount: 1,
    priceUsd: 20,
    priceBrl: 100,
    limitKey: 'maxSites',
    icon: 'Globe',
  },
}

export const ALL_ADDON_TYPES = Object.keys(ADDON_CONFIGS) as AddonType[]

/**
 * Calcula o bônus total de add-ons para um limitKey específico.
 * Ex: org tem 2x extra_users → retorna 2
 */
export function calculateAddonBonus(
  addons: { addon_type: string; quantity: number; status: string }[],
  limitKey: string
): number {
  return addons
    .filter(a => a.status === 'active')
    .reduce((total, addon) => {
      const config = ADDON_CONFIGS[addon.addon_type as AddonType]
      if (config && config.limitKey === limitKey) {
        return total + (config.unitAmount * addon.quantity)
      }
      return total
    }, 0)
}
