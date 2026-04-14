-- ═══════════════════════════════════════════════════════════════════════════════
-- ORYEN AI — Script RLS Completo
-- Data: 2026-04-14
--
-- Este script habilita RLS e cria policies para TODAS as tabelas que estavam
-- sem proteção. Execute no Supabase SQL Editor.
--
-- IMPORTANTE: Este script usa IF NOT EXISTS onde possível e é idempotente.
-- Pode ser executado múltiplas vezes sem risco.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER: Função para verificar org_id do usuário autenticado
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid()
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. USERS — Usuários podem ver membros da mesma org
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ver próprio perfil e membros da mesma org
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_select_org' AND tablename = 'users') THEN
    CREATE POLICY users_select_org ON public.users
      FOR SELECT USING (
        org_id = public.get_user_org_id()
        OR id = auth.uid()
      );
  END IF;
END $$;

-- Atualizar apenas próprio perfil
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_update_self' AND tablename = 'users') THEN
    CREATE POLICY users_update_self ON public.users
      FOR UPDATE USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Service role pode tudo (para onboarding, invite, etc.)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_service_role' AND tablename = 'users') THEN
    CREATE POLICY users_service_role ON public.users
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ORGS — Usuários podem ver apenas sua própria org
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orgs_select_own' AND tablename = 'orgs') THEN
    CREATE POLICY orgs_select_own ON public.orgs
      FOR SELECT USING (
        id = public.get_user_org_id()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orgs_update_own' AND tablename = 'orgs') THEN
    CREATE POLICY orgs_update_own ON public.orgs
      FOR UPDATE USING (id = public.get_user_org_id())
      WITH CHECK (id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orgs_service_role' AND tablename = 'orgs') THEN
    CREATE POLICY orgs_service_role ON public.orgs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. LEADS — Tabela mais crítica do CRM
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leads_select_org' AND tablename = 'leads') THEN
    CREATE POLICY leads_select_org ON public.leads
      FOR SELECT USING (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leads_insert_org' AND tablename = 'leads') THEN
    CREATE POLICY leads_insert_org ON public.leads
      FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leads_update_org' AND tablename = 'leads') THEN
    CREATE POLICY leads_update_org ON public.leads
      FOR UPDATE USING (org_id = public.get_user_org_id())
      WITH CHECK (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leads_delete_org' AND tablename = 'leads') THEN
    CREATE POLICY leads_delete_org ON public.leads
      FOR DELETE USING (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leads_service_role' AND tablename = 'leads') THEN
    CREATE POLICY leads_service_role ON public.leads
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. PIPELINE_STAGES — Configuração de pipeline por org
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_stages_select_org' AND tablename = 'pipeline_stages') THEN
    CREATE POLICY pipeline_stages_select_org ON public.pipeline_stages
      FOR SELECT USING (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_stages_manage_org' AND tablename = 'pipeline_stages') THEN
    CREATE POLICY pipeline_stages_manage_org ON public.pipeline_stages
      FOR ALL USING (org_id = public.get_user_org_id())
      WITH CHECK (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_stages_service_role' AND tablename = 'pipeline_stages') THEN
    CREATE POLICY pipeline_stages_service_role ON public.pipeline_stages
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. AGENTS — Configuração de agentes IA
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_select_org' AND tablename = 'agents') THEN
    CREATE POLICY agents_select_org ON public.agents
      FOR SELECT USING (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_manage_org' AND tablename = 'agents') THEN
    CREATE POLICY agents_manage_org ON public.agents
      FOR ALL USING (org_id = public.get_user_org_id())
      WITH CHECK (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_service_role' AND tablename = 'agents') THEN
    CREATE POLICY agents_service_role ON public.agents
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. AGENT_CAMPAIGNS — Campanhas de agentes
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agent_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_campaigns_select_org' AND tablename = 'agent_campaigns') THEN
    CREATE POLICY agent_campaigns_select_org ON public.agent_campaigns
      FOR SELECT USING (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_campaigns_manage_org' AND tablename = 'agent_campaigns') THEN
    CREATE POLICY agent_campaigns_manage_org ON public.agent_campaigns
      FOR ALL USING (org_id = public.get_user_org_id())
      WITH CHECK (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_campaigns_service_role' AND tablename = 'agent_campaigns') THEN
    CREATE POLICY agent_campaigns_service_role ON public.agent_campaigns
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. AGENT_RUNS — Execuções de agentes
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_runs_select_org' AND tablename = 'agent_runs') THEN
    CREATE POLICY agent_runs_select_org ON public.agent_runs
      FOR SELECT USING (org_id = public.get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_runs_service_role' AND tablename = 'agent_runs') THEN
    CREATE POLICY agent_runs_service_role ON public.agent_runs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. AGENT_SOLUTIONS — Catálogo de soluções de agentes
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_solutions' AND table_schema = 'public') THEN
    ALTER TABLE public.agent_solutions ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_solutions_public_read' AND tablename = 'agent_solutions') THEN
      CREATE POLICY agent_solutions_public_read ON public.agent_solutions
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_solutions_service_role' AND tablename = 'agent_solutions') THEN
      CREATE POLICY agent_solutions_service_role ON public.agent_solutions
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. ORG_ADDONS — Add-ons e assinaturas
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'org_addons' AND table_schema = 'public') THEN
    ALTER TABLE public.org_addons ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_addons_select_org' AND tablename = 'org_addons') THEN
      CREATE POLICY org_addons_select_org ON public.org_addons
        FOR SELECT USING (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_addons_service_role' AND tablename = 'org_addons') THEN
      CREATE POLICY org_addons_service_role ON public.org_addons
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. DOCUMENTS — Documentos gerados
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'documents_select_org' AND tablename = 'documents') THEN
      CREATE POLICY documents_select_org ON public.documents
        FOR SELECT USING (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'documents_manage_org' AND tablename = 'documents') THEN
      CREATE POLICY documents_manage_org ON public.documents
        FOR ALL USING (org_id = public.get_user_org_id())
        WITH CHECK (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'documents_service_role' AND tablename = 'documents') THEN
      CREATE POLICY documents_service_role ON public.documents
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. DOCUMENT_TEMPLATES — Tabela global do sistema (sem org_id)
--     Filtrada por niche no código. Leitura pública, escrita só via service_role.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_templates' AND table_schema = 'public') THEN
    ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_templates_public_read' AND tablename = 'document_templates') THEN
      CREATE POLICY document_templates_public_read ON public.document_templates
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_templates_service_role' AND tablename = 'document_templates') THEN
      CREATE POLICY document_templates_service_role ON public.document_templates
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. DOCUMENT_CATEGORIES — Tabela global do sistema (sem org_id)
--     Filtrada por niche no código. Leitura pública, escrita só via service_role.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_categories' AND table_schema = 'public') THEN
    ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_categories_public_read' AND tablename = 'document_categories') THEN
      CREATE POLICY document_categories_public_read ON public.document_categories
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_categories_service_role' AND tablename = 'document_categories') THEN
      CREATE POLICY document_categories_service_role ON public.document_categories
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. LEAD_DOCUMENTS — Documentos vinculados a leads
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_documents' AND table_schema = 'public') THEN
    ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_documents_select_org' AND tablename = 'lead_documents') THEN
      CREATE POLICY lead_documents_select_org ON public.lead_documents
        FOR SELECT USING (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_documents_manage_org' AND tablename = 'lead_documents') THEN
      CREATE POLICY lead_documents_manage_org ON public.lead_documents
        FOR ALL USING (org_id = public.get_user_org_id())
        WITH CHECK (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_documents_service_role' AND tablename = 'lead_documents') THEN
      CREATE POLICY lead_documents_service_role ON public.lead_documents
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. LEAD_EVENTS — Eventos/atividades de leads (sem org_id, usa lead_id)
--     Leitura via join com leads da org. Escrita só via service_role.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_events' AND table_schema = 'public') THEN
    ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_events_select_via_lead' AND tablename = 'lead_events') THEN
      CREATE POLICY lead_events_select_via_lead ON public.lead_events
        FOR SELECT USING (
          lead_id IN (SELECT id FROM public.leads WHERE org_id = public.get_user_org_id())
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_events_service_role' AND tablename = 'lead_events') THEN
      CREATE POLICY lead_events_service_role ON public.lead_events
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. ALERTS — Alertas do sistema (usa user_id, não org_id)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerts' AND table_schema = 'public') THEN
    ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'alerts_select_own' AND tablename = 'alerts') THEN
      CREATE POLICY alerts_select_own ON public.alerts
        FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'alerts_update_own' AND tablename = 'alerts') THEN
      CREATE POLICY alerts_update_own ON public.alerts
        FOR UPDATE USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'alerts_service_role' AND tablename = 'alerts') THEN
      CREATE POLICY alerts_service_role ON public.alerts
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. GOALS (legacy) — Tabela antiga de metas
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals' AND table_schema = 'public') THEN
    ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_select_org' AND tablename = 'goals') THEN
      CREATE POLICY goals_select_org ON public.goals
        FOR SELECT USING (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_manage_org' AND tablename = 'goals') THEN
      CREATE POLICY goals_manage_org ON public.goals
        FOR ALL USING (org_id = public.get_user_org_id())
        WITH CHECK (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_service_role' AND tablename = 'goals') THEN
      CREATE POLICY goals_service_role ON public.goals
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 17. GOAL_TEMPLATES — Templates de metas (leitura pública, gestão admin)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_templates' AND table_schema = 'public') THEN
    ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goal_templates_public_read' AND tablename = 'goal_templates') THEN
      CREATE POLICY goal_templates_public_read ON public.goal_templates
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goal_templates_service_role' AND tablename = 'goal_templates') THEN
      CREATE POLICY goal_templates_service_role ON public.goal_templates
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 18. LEAD_SCORES — Pontuação de leads
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_scores' AND table_schema = 'public') THEN
    ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_scores_select_org' AND tablename = 'lead_scores') THEN
      CREATE POLICY lead_scores_select_org ON public.lead_scores
        FOR SELECT USING (org_id = public.get_user_org_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lead_scores_service_role' AND tablename = 'lead_scores') THEN
      CREATE POLICY lead_scores_service_role ON public.lead_scores
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL — Lista todas as tabelas e seu status RLS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Execute esta query separadamente para verificar:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
