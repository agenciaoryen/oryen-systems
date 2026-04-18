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

export type AddonType =
  | 'extra_users'
  | 'extra_messages'
  | 'extra_whatsapp'
  | 'extra_sites'
  | 'extra_documents'
  | 'extra_properties'
  | 'extra_leads'

export interface AddonConfig {
  type: AddonType
  displayName: string
  description: string
  unitLabel: string
  unitAmount: number           // quanto cada unidade adiciona ao limite
  priceUsd: number             // preço mensal por unidade (USD)
  priceBrl: number             // preço mensal por unidade (BRL)
  stripePriceId: string        // price_id do Stripe (hardcoded, igual aos planos)
  limitKey: string             // qual campo do PlanLimits este addon expande
  icon: string                 // nome do ícone Lucide
}

// ═══════════════════════════════════════════════════════════════════════════════
// Para adicionar um novo add-on no futuro:
// 1. Crie o produto recorrente no Stripe Dashboard
// 2. Adicione o tipo no AddonType acima
// 3. Adicione a config aqui com o stripePriceId
// 4. Pronto — planLimits, API, billing page e webhook já funcionam automaticamente
// ═══════════════════════════════════════════════════════════════════════════════

export const ADDON_CONFIGS: Record<AddonType, AddonConfig> = {
  extra_users: {
    type: 'extra_users',
    displayName: 'Usuários Extras',
    description: 'Adicione mais membros à sua equipe',
    unitLabel: 'usuário',
    unitAmount: 1,
    priceUsd: 15,
    priceBrl: 75,
    stripePriceId: 'price_1TLnsj3PghkCuiR4En2Vkx0T',
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
    stripePriceId: 'price_1TLnuC3PghkCuiR4b5tZZdL7',
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
    stripePriceId: 'price_1TLnus3PghkCuiR4FrQKR4Cl',
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
    stripePriceId: 'price_1TLnvb3PghkCuiR44OL98HHj',
    limitKey: 'maxSites',
    icon: 'Globe',
  },
  extra_documents: {
    type: 'extra_documents',
    displayName: 'Documentos Extras',
    description: 'Mais documentos gerados por mês',
    unitLabel: '50 documentos',
    unitAmount: 50,
    priceUsd: 15,
    priceBrl: 75,
    stripePriceId: 'price_1TNfKd3PghkCuiR4XHyIooMp',
    limitKey: 'maxDocumentsPerMonth',
    icon: 'FileText',
  },
  extra_properties: {
    type: 'extra_properties',
    displayName: 'Imóveis Extras',
    description: 'Mais espaço no portfólio de imóveis',
    unitLabel: '100 imóveis',
    unitAmount: 100,
    priceUsd: 15,
    priceBrl: 75,
    stripePriceId: 'price_1TNfLa3PghkCuiR4y6wTgWR0',
    limitKey: 'maxProperties',
    icon: 'Building2',
  },
  extra_leads: {
    type: 'extra_leads',
    displayName: 'Leads Extras',
    description: 'Mais espaço para leads ativos no CRM',
    unitLabel: '1.000 leads',
    unitAmount: 1000,
    priceUsd: 20,
    priceBrl: 100,
    stripePriceId: 'price_1TNfML3PghkCuiR4rs9iaENu',
    limitKey: 'maxActiveLeads',
    icon: 'UserPlus',
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
