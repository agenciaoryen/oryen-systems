// lib/site/types.ts

export interface SocialLinks {
  instagram?: string
  facebook?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
}

export interface SiteSettings {
  id: string
  org_id: string
  slug: string
  site_name: string | null
  tagline: string | null
  logo_url: string | null
  cover_image_url: string | null
  primary_color: string
  accent_color: string
  bio: string | null
  avatar_url: string | null
  creci: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  social_links: SocialLinks
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  is_published: boolean
  custom_domain: string | null
  created_at: string
  updated_at: string
}

export interface SiteLead {
  id: string
  org_id: string
  property_id: string | null
  name: string
  email: string | null
  phone: string
  message: string | null
  source: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  synced_to_crm: boolean
  lead_id: string | null
  created_at: string
}
