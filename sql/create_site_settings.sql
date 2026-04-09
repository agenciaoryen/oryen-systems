-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabela: site_settings
-- Configuração do site público de cada org (1 site por org)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,

  -- Branding
  site_name TEXT,
  tagline TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#4B6BFB',
  accent_color TEXT DEFAULT '#F0A030',

  -- Sobre o corretor
  bio TEXT,
  avatar_url TEXT,
  creci TEXT,

  -- Contato
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,

  -- Redes sociais
  social_links JSONB DEFAULT '{}',

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,

  -- Publicação
  is_published BOOLEAN DEFAULT false,
  custom_domain TEXT,
  domain_status TEXT, -- 'pending', 'active', 'misconfigured'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1 site por org
  UNIQUE(org_id)
);

-- ═══ Indexes ═══

CREATE INDEX IF NOT EXISTS idx_site_settings_slug
  ON site_settings(slug);

CREATE INDEX IF NOT EXISTS idx_site_settings_org
  ON site_settings(org_id);

-- ═══ RLS Policies ═══

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Público pode ver sites publicados (para renderizar o site)
CREATE POLICY "Anyone can view published sites"
  ON site_settings FOR SELECT
  USING (is_published = true);

-- Membros da org podem ver config do próprio site
CREATE POLICY "Org members can view own site"
  ON site_settings FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem criar config do site
CREATE POLICY "Org members can insert site settings"
  ON site_settings FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem atualizar config do site
CREATE POLICY "Org members can update own site"
  ON site_settings FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem deletar config do site
CREATE POLICY "Org members can delete own site"
  ON site_settings FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
