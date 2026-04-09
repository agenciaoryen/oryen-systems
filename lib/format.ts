// lib/format.ts

/**
 * Formata valores monetários baseados na preferência do utilizador.
 * Ex: formatPrice(1500, 'BRL', 'pt-BR') -> R$ 1.500,00
 * Ex: formatPrice(1500, 'USD', 'en-US') -> $1,500.00
 * Ex: formatPrice(1500, 'CLP', 'es-CL') -> $1.500 (Pesos chilenos não costumam usar centavos)
 */
export const formatPrice = (
  value: number | null | undefined, 
  currency: string = 'BRL', 
  locale: string = 'pt-BR'
) => {
  // Proteção contra valores nulos/indefinidos (exibe 0 por padrão)
  const safeValue = value ?? 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol', // Garante o símbolo ($, R$, €)
    }).format(safeValue);
  } catch (error) {
    // Fallback caso o código da moeda ou locale sejam inválidos
    console.error(`Erro ao formatar moeda: ${currency}/${locale}`, error);
    return `${currency} ${safeValue.toFixed(2)}`;
  }
};

/**
 * Formata datas curtas para tabelas e listas.
 * Ex: 16 de jan. de 2026
 */
export const formatDate = (
  dateInput: string | Date | null,
  locale: string = 'pt-BR',
  timezone: string = 'America/Sao_Paulo'
) => {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezone, // O Pulo do Gato: respeita o fuso do usuário!
  }).format(date);
};

/**
 * Formata data e hora para logs e histórico de mensagens.
 * Ex: 16/01/2026 14:30
 */
export const formatDateTime = (
  dateInput: string | Date | null,
  locale: string = 'pt-BR',
  timezone: string = 'America/Sao_Paulo'
) => {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(date);
};

/**
 * Formata a origem do lead com rótulos amigáveis.
 * Ex: "whatsapp_inbound" → "WhatsApp (entrada)"
 */
const SOURCE_LABELS: Record<string, Record<string, string>> = {
  whatsapp_inbound: { pt: 'WhatsApp (entrada)', en: 'WhatsApp (inbound)', es: 'WhatsApp (entrada)' },
  whatsapp_outbound: { pt: 'WhatsApp (prospecção)', en: 'WhatsApp (outbound)', es: 'WhatsApp (prospección)' },
  whatsapp: { pt: 'WhatsApp', en: 'WhatsApp', es: 'WhatsApp' },
  instagram: { pt: 'Instagram', en: 'Instagram', es: 'Instagram' },
  facebook: { pt: 'Facebook', en: 'Facebook', es: 'Facebook' },
  website: { pt: 'Site', en: 'Website', es: 'Sitio web' },
  site: { pt: 'Site', en: 'Website', es: 'Sitio web' },
  referral: { pt: 'Indicação', en: 'Referral', es: 'Referido' },
  manual: { pt: 'Cadastro manual', en: 'Manual entry', es: 'Registro manual' },
  import: { pt: 'Importação', en: 'Import', es: 'Importación' },
  csv_import: { pt: 'Importação CSV', en: 'CSV Import', es: 'Importación CSV' },
  api: { pt: 'API externa', en: 'External API', es: 'API externa' },
  google_ads: { pt: 'Google Ads', en: 'Google Ads', es: 'Google Ads' },
  meta_ads: { pt: 'Meta Ads', en: 'Meta Ads', es: 'Meta Ads' },
  organic: { pt: 'Orgânico', en: 'Organic', es: 'Orgánico' },
  landing_page: { pt: 'Página de captura', en: 'Landing page', es: 'Página de captura' },
}

export const formatSource = (source: string, lang: string = 'pt'): string => {
  if (!source) return '-'
  const label = SOURCE_LABELS[source.toLowerCase()]
  if (label) return label[lang] || label.pt
  return source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}