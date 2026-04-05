-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabela: properties
-- Portfólio de imóveis — source-of-truth para site, SDR agent e Instagram
-- Cada org cadastra seus imóveis aqui, e eles são publicados automaticamente
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT,

  -- Tipo e transação
  property_type TEXT NOT NULL DEFAULT 'apartment'
    CHECK (property_type IN ('apartment', 'house', 'commercial', 'land', 'rural', 'other')),
  transaction_type TEXT NOT NULL DEFAULT 'sale'
    CHECK (transaction_type IN ('sale', 'rent', 'sale_or_rent')),

  -- Valores
  price NUMERIC(15,2),
  condo_fee NUMERIC(10,2),
  iptu NUMERIC(10,2),

  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- Características
  bedrooms INT DEFAULT 0,
  suites INT DEFAULT 0,
  bathrooms INT DEFAULT 0,
  parking_spots INT DEFAULT 0,
  total_area NUMERIC(10,2),
  private_area NUMERIC(10,2),

  -- Amenidades e mídia (JSONB para flexibilidade)
  amenities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  video_url TEXT,
  virtual_tour_url TEXT,

  -- Status e destaque
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'sold', 'rented', 'inactive')),
  is_featured BOOLEAN DEFAULT false,

  -- Código externo (MLS ou outro sistema)
  external_code TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- ═══ Indexes ═══

CREATE INDEX IF NOT EXISTS idx_properties_org_status
  ON properties(org_id, status);

CREATE INDEX IF NOT EXISTS idx_properties_org_slug
  ON properties(org_id, slug);

CREATE INDEX IF NOT EXISTS idx_properties_org_type
  ON properties(org_id, property_type, transaction_type);

CREATE INDEX IF NOT EXISTS idx_properties_org_price
  ON properties(org_id, price);

-- ═══ Updated_at trigger ═══

CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties FOR EACH ROW
  EXECUTE FUNCTION update_properties_updated_at();

-- ═══ RLS Policies ═══

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Público pode ver imóveis ativos de sites publicados
CREATE POLICY "Anyone can view active properties of published sites"
  ON properties FOR SELECT
  USING (
    status = 'active' AND
    org_id IN (SELECT org_id FROM site_settings WHERE is_published = true)
  );

-- Membros da org podem ver todos os imóveis da org
CREATE POLICY "Org members can view own properties"
  ON properties FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem inserir imóveis
CREATE POLICY "Org members can insert properties"
  ON properties FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem atualizar seus imóveis
CREATE POLICY "Org members can update own properties"
  ON properties FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem deletar seus imóveis
CREATE POLICY "Org members can delete own properties"
  ON properties FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
