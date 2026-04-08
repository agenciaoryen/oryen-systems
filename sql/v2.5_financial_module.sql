-- ═══════════════════════════════════════════════════════════════════════════════
-- v2.5 — Financial Module
-- Tabelas: commission_rules, financial_transactions, commissions,
--          recurring_expenses, expense_approvals
-- Trigger: trg_lead_won (auto-gera receita + comissao)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── HELPER: Calcula rate baseado em tiers JSONB ─────────────────────────────

CREATE OR REPLACE FUNCTION fn_calculate_tiered_rate(tiers JSONB, deal_value NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  tier RECORD;
BEGIN
  FOR tier IN
    SELECT elem FROM jsonb_array_elements(tiers) AS t(elem)
    ORDER BY (t.elem->>'up_to')::NUMERIC NULLS LAST
  LOOP
    IF tier.elem->>'up_to' IS NULL OR deal_value <= (tier.elem->>'up_to')::NUMERIC THEN
      RETURN (tier.elem->>'rate')::NUMERIC;
    END IF;
  END LOOP;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ─── 1. COMMISSION RULES ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',

  -- Tiered: [{"up_to": 500000, "rate": 3.0}, {"up_to": null, "rate": 2.5}]
  tiers JSONB NOT NULL DEFAULT '[{"up_to": null, "rate": 5.0}]',

  agency_split_pct NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  broker_split_pct NUMERIC(5,2) NOT NULL DEFAULT 50.00,

  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT split_sum CHECK (agency_split_pct + broker_split_pct = 100)
);

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_rules_select" ON commission_rules FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "commission_rules_all" ON commission_rules FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));


-- ─── 2. RECURRING EXPENSES (antes de financial_transactions por FK) ──────────

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',

  day_of_month INT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  is_active BOOLEAN NOT NULL DEFAULT true,

  last_generated_month DATE,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_expenses_select" ON recurring_expenses FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "recurring_expenses_all" ON recurring_expenses FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));


-- ─── 3. FINANCIAL TRANSACTIONS (ledger central) ─────────────────────────────

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense', 'commission')),
  category TEXT NOT NULL,

  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',

  description TEXT,

  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  commission_rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  recurring_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),

  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_month DATE NOT NULL,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  notes TEXT,
  attachments JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_transactions_select" ON financial_transactions FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "financial_transactions_all" ON financial_transactions FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));


-- ─── 4. COMMISSIONS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,

  deal_value NUMERIC(15,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  total_commission NUMERIC(15,2) NOT NULL,
  agency_amount NUMERIC(15,2) NOT NULL,
  broker_amount NUMERIC(15,2) NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),

  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_select" ON commissions FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "commissions_all" ON commissions FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));


-- ─── 5. EXPENSE APPROVALS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_approvals_select" ON expense_approvals FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "expense_approvals_all" ON expense_approvals FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner','admin')));


-- ─── ALTERACOES EM TABELAS EXISTENTES ────────────────────────────────────────

ALTER TABLE broker_config ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_closed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_generated BOOLEAN DEFAULT false;


-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ft_org_month ON financial_transactions(org_id, reference_month, type);
CREATE INDEX IF NOT EXISTS idx_ft_org_date ON financial_transactions(org_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_ft_broker ON financial_transactions(broker_id, type);
CREATE INDEX IF NOT EXISTS idx_commissions_org ON commissions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_broker ON commissions(broker_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_org ON recurring_expenses(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_commission_rules_org ON commission_rules(org_id, is_active);


-- ─── TRIGGER: AUTO-GERA RECEITA + COMISSAO QUANDO LEAD FECHA ────────────────

CREATE OR REPLACE FUNCTION fn_on_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  v_stage RECORD;
  v_rule RECORD;
  v_rate NUMERIC;
  v_total_commission NUMERIC;
  v_agency_amount NUMERIC;
  v_broker_amount NUMERIC;
  v_tx_id UUID;
  v_ref_month DATE;
BEGIN
  -- So dispara quando stage muda
  IF OLD.stage = NEW.stage THEN RETURN NEW; END IF;
  IF NEW.commission_generated = true THEN RETURN NEW; END IF;

  -- Verifica se o novo stage eh is_won
  SELECT is_won INTO v_stage FROM pipeline_stages
    WHERE org_id = NEW.org_id AND name = NEW.stage LIMIT 1;

  IF NOT FOUND OR NOT v_stage.is_won THEN RETURN NEW; END IF;
  IF NEW.total_em_vendas IS NULL OR NEW.total_em_vendas <= 0 THEN RETURN NEW; END IF;

  v_ref_month := date_trunc('month', CURRENT_DATE)::DATE;

  -- Cria transacao de receita
  INSERT INTO financial_transactions (
    org_id, type, category, amount, currency, lead_id, broker_id,
    status, transaction_date, reference_month, description
  ) VALUES (
    NEW.org_id, 'revenue', 'deal_closed', NEW.total_em_vendas, 'BRL',
    NEW.id, NEW.assigned_to, 'confirmed', CURRENT_DATE, v_ref_month,
    'Auto: deal closed - ' || COALESCE(NEW.name, '')
  ) RETURNING id INTO v_tx_id;

  -- Busca regra de comissao (broker-specific primeiro, depois org default)
  SELECT * INTO v_rule FROM commission_rules
    WHERE org_id = NEW.org_id AND is_active = true
    AND (broker_id = NEW.assigned_to OR broker_id IS NULL)
    ORDER BY priority DESC, broker_id IS NOT NULL DESC LIMIT 1;

  IF FOUND THEN
    v_rate := fn_calculate_tiered_rate(v_rule.tiers, NEW.total_em_vendas);
    v_total_commission := NEW.total_em_vendas * (v_rate / 100);
    v_agency_amount := v_total_commission * (v_rule.agency_split_pct / 100);
    v_broker_amount := v_total_commission * (v_rule.broker_split_pct / 100);

    INSERT INTO commissions (
      org_id, transaction_id, lead_id, broker_id, commission_rule_id,
      deal_value, commission_rate, total_commission, agency_amount, broker_amount,
      currency, status
    ) VALUES (
      NEW.org_id, v_tx_id, NEW.id, NEW.assigned_to, v_rule.id,
      NEW.total_em_vendas, v_rate, v_total_commission, v_agency_amount, v_broker_amount,
      'BRL', 'pending'
    );
  END IF;

  NEW.deal_closed_at := now();
  NEW.commission_generated := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_won ON leads;
CREATE TRIGGER trg_lead_won
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_lead_won();
