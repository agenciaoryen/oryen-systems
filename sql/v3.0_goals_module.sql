-- ═══════════════════════════════════════════════════════════════════════════════
-- v3.0 — Goals Module (Metas Estrategicas)
-- Tabelas: goal_templates, org_goals, goal_snapshots, goal_streaks
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. GOAL TEMPLATES (reference table, system-defined) ────────────────────

CREATE TABLE IF NOT EXISTS goal_templates (
  id TEXT PRIMARY KEY,
  name_pt TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,
  icon TEXT NOT NULL DEFAULT 'Target',
  unit TEXT NOT NULL DEFAULT 'number',
  data_source TEXT NOT NULL,
  default_target NUMERIC,
  requires_plan TEXT NOT NULL DEFAULT 'gold',
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO goal_templates (id, name_pt, name_en, name_es, description_pt, description_en, description_es, icon, unit, data_source, default_target, requires_plan, sort_order) VALUES
  ('revenue',         'Receita',              'Revenue',              'Ingresos',              'Receita total de negocios fechados no mes',              'Total revenue from closed deals this month',              'Ingresos totales de negocios cerrados en el mes',              'DollarSign',   'currency',    'financial_transactions', 50000,  'gold',    1),
  ('deals_closed',    'Negocios Fechados',    'Deals Closed',         'Negocios Cerrados',     'Quantidade de negocios ganhos no mes',                   'Number of deals won this month',                          'Cantidad de negocios ganados en el mes',                    'Handshake',    'number',      'leads',                  5,      'gold',    2),
  ('leads_captured',  'Leads Captados',       'Leads Captured',       'Leads Captados',        'Novos leads que entraram no CRM no mes',                 'New leads added to CRM this month',                       'Nuevos leads ingresados al CRM en el mes',                  'UserPlus',     'number',      'leads',                  50,     'gold',    3),
  ('response_time',   'Tempo de Resposta',    'Response Time',        'Tiempo de Respuesta',   'Tempo medio de primeira resposta em minutos (menor = melhor)', 'Average first response time in minutes (lower = better)', 'Tiempo promedio de primera respuesta en minutos (menor = mejor)', 'Clock', 'minutes', 'lead_activity_log', 30, 'gold', 4),
  ('follow_up_rate',  'Taxa de Follow-up',    'Follow-up Rate',       'Tasa de Follow-up',     'Percentual de follow-ups respondidos vs total',          'Percentage of follow-ups responded vs total',             'Porcentaje de follow-ups respondidos vs total',             'RefreshCw',    'percentage',  'follow_up_queue',        80,     'gold',    5),
  ('meetings',        'Reunioes Agendadas',   'Meetings Scheduled',   'Reuniones Agendadas',   'Quantidade de reunioes e visitas agendadas',             'Number of meetings and visits scheduled',                 'Cantidad de reuniones y visitas agendadas',                 'CalendarDays', 'number',      'calendar_events',        20,     'gold',    6),
  ('conversion_rate', 'Taxa de Conversao',    'Conversion Rate',      'Tasa de Conversion',    'Percentual de leads que se tornaram negocios ganhos',    'Percentage of leads that became won deals',               'Porcentaje de leads que se convirtieron en negocios ganados','TrendingUp',  'percentage',  'leads',                  10,     'gold',    7),
  ('ads_budget',      'Orcamento de Ads',     'Ads Budget',           'Presupuesto de Ads',    'Orcamento mensal de marketing e anuncios',               'Monthly marketing and ads budget',                        'Presupuesto mensual de marketing y anuncios',               'Megaphone',    'currency',    'manual',                 5000,   'gold',    8),
  ('custom',          'Meta Personalizada',   'Custom Goal',          'Meta Personalizada',    'Meta com acompanhamento manual',                         'Goal with manual tracking',                               'Meta con seguimiento manual',                               'Target',       'number',      'manual',                 0,      'diamond', 9)
ON CONFLICT (id) DO NOTHING;


-- ─── 2. ORG GOALS (active goals per org per month) ──────────────────────────

CREATE TABLE IF NOT EXISTS org_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES goal_templates(id),

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  target_value NUMERIC(15,2) NOT NULL,
  current_value NUMERIC(15,2) NOT NULL DEFAULT 0,

  custom_name TEXT,
  custom_description TEXT,

  broker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(org_id, template_id, period_start, broker_id)
);

ALTER TABLE org_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_goals_select" ON org_goals FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_goals_all" ON org_goals FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));

CREATE INDEX IF NOT EXISTS idx_org_goals_org_period ON org_goals(org_id, period_start);
CREATE INDEX IF NOT EXISTS idx_org_goals_template ON org_goals(org_id, template_id, period_start);


-- ─── 3. GOAL SNAPSHOTS (daily progress for trends) ──────────────────────────

CREATE TABLE IF NOT EXISTS goal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES org_goals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  snapshot_date DATE NOT NULL,
  value NUMERIC(15,2) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(goal_id, snapshot_date)
);

ALTER TABLE goal_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_snapshots_select" ON goal_snapshots FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal ON goal_snapshots(goal_id, snapshot_date);


-- ─── 4. GOAL STREAKS (consecutive months achieved) ───────────────────────────

CREATE TABLE IF NOT EXISTS goal_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES goal_templates(id),
  broker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_achieved_month DATE,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_goal_streaks_unique
  ON goal_streaks (org_id, template_id, COALESCE(broker_id, '00000000-0000-0000-0000-000000000000'::UUID));

ALTER TABLE goal_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_streaks_select" ON goal_streaks FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "goal_streaks_all" ON goal_streaks FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));


-- ─── MIGRATE OLD GOALS DATA ─────────────────────────────────────────────────

INSERT INTO org_goals (org_id, template_id, period_start, period_end, target_value, is_active)
SELECT
  org_id,
  'revenue',
  month,
  (month + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
  revenue_target,
  true
FROM goals
WHERE revenue_target > 0
ON CONFLICT DO NOTHING;

INSERT INTO org_goals (org_id, template_id, period_start, period_end, target_value, is_active)
SELECT
  org_id,
  'ads_budget',
  month,
  (month + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
  ads_budget,
  true
FROM goals
WHERE ads_budget > 0
ON CONFLICT DO NOTHING;
