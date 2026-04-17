-- ═══════════════════════════════════════════════════════════════════════════════
-- Sistema de Roles customizáveis por organização
-- ═══════════════════════════════════════════════════════════════════════════════
-- Cada org tem seus próprios roles. 'admin' e 'vendedor' são roles de sistema
-- (criados automaticamente). 'staff' é role MASTER global (time Oryen) e NÃO
-- aparece nesta tabela — ele é tratado à parte via users.role = 'staff'.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_org_roles_org_id ON org_roles(org_id);

-- ─── RLS ───
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_roles_select_same_org" ON org_roles;
CREATE POLICY "org_roles_select_same_org" ON org_roles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

DROP POLICY IF EXISTS "org_roles_admin_write" ON org_roles;
CREATE POLICY "org_roles_admin_write" ON org_roles
  FOR ALL USING (
    (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- ─── SEEDER: criar roles de sistema para todas as orgs existentes ───
INSERT INTO org_roles (org_id, name, slug, is_system, is_admin, permissions)
SELECT
  id,
  'Administrador',
  'admin',
  true,
  true,
  '{}'::jsonb  -- admin sempre tem tudo (hardcoded no código)
FROM orgs
ON CONFLICT (org_id, slug) DO NOTHING;

INSERT INTO org_roles (org_id, name, slug, is_system, is_admin, permissions)
SELECT
  id,
  'Vendedor',
  'vendedor',
  true,
  false,
  jsonb_build_object(
    'crm', true,
    'messages', true,
    'calendar', true,
    'distribution', false,
    'goals', true,
    'agents', false,
    'follow_up', false,
    'analytics', false,
    'portfolio', true,
    'property_stats', false,
    'site', false,
    'financial', false,
    'subscription', false,
    'whatsapp', false,
    'documents', true,
    'reports', true,
    'financing', false
  )
FROM orgs
ON CONFLICT (org_id, slug) DO NOTHING;

-- ─── TRIGGER: criar roles de sistema automaticamente para novas orgs ───
CREATE OR REPLACE FUNCTION seed_org_system_roles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO org_roles (org_id, name, slug, is_system, is_admin, permissions)
  VALUES (NEW.id, 'Administrador', 'admin', true, true, '{}'::jsonb)
  ON CONFLICT (org_id, slug) DO NOTHING;

  INSERT INTO org_roles (org_id, name, slug, is_system, is_admin, permissions)
  VALUES (
    NEW.id, 'Vendedor', 'vendedor', true, false,
    jsonb_build_object(
      'crm', true, 'messages', true, 'calendar', true, 'distribution', false,
      'goals', true, 'agents', false, 'follow_up', false, 'analytics', false,
      'portfolio', true, 'property_stats', false, 'site', false,
      'financial', false, 'subscription', false, 'whatsapp', false,
      'documents', true, 'reports', true, 'financing', false
    )
  )
  ON CONFLICT (org_id, slug) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_org_system_roles ON orgs;
CREATE TRIGGER trg_seed_org_system_roles
  AFTER INSERT ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION seed_org_system_roles();

-- ─── TRIGGER: updated_at ───
CREATE OR REPLACE FUNCTION touch_org_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_roles_updated_at ON org_roles;
CREATE TRIGGER trg_org_roles_updated_at
  BEFORE UPDATE ON org_roles
  FOR EACH ROW
  EXECUTE FUNCTION touch_org_roles_updated_at();
