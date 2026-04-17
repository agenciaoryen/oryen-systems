-- ═══════════════════════════════════════════════════════════════════════════════
-- STAFF RLS BYPASS
-- Data: 2026-04-17
--
-- Staff (users.role = 'staff') precisa acessar qualquer org do sistema para
-- dar suporte. As policies anteriores travavam staff no próprio org_id.
--
-- Este script:
--  1. Cria helper is_staff_user() (security definer)
--  2. Recria todas as policies org-scoped trocando:
--       USING (org_id = public.get_user_org_id())
--     por:
--       USING (org_id = public.get_user_org_id() OR public.is_staff_user())
--
-- Idempotente — pode rodar múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── HELPER ───
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'staff'
  )
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. USERS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS users_select_org ON public.users;
CREATE POLICY users_select_org ON public.users
  FOR SELECT USING (
    org_id = public.get_user_org_id()
    OR id = auth.uid()
    OR public.is_staff_user()
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ORGS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS orgs_select_own ON public.orgs;
CREATE POLICY orgs_select_own ON public.orgs
  FOR SELECT USING (
    id = public.get_user_org_id() OR public.is_staff_user()
  );

DROP POLICY IF EXISTS orgs_update_own ON public.orgs;
CREATE POLICY orgs_update_own ON public.orgs
  FOR UPDATE USING (id = public.get_user_org_id() OR public.is_staff_user())
  WITH CHECK (id = public.get_user_org_id() OR public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. LEADS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS leads_select_org ON public.leads;
CREATE POLICY leads_select_org ON public.leads
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

DROP POLICY IF EXISTS leads_insert_org ON public.leads;
CREATE POLICY leads_insert_org ON public.leads
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());

DROP POLICY IF EXISTS leads_update_org ON public.leads;
CREATE POLICY leads_update_org ON public.leads
  FOR UPDATE USING (org_id = public.get_user_org_id() OR public.is_staff_user())
  WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());

DROP POLICY IF EXISTS leads_delete_org ON public.leads;
CREATE POLICY leads_delete_org ON public.leads
  FOR DELETE USING (org_id = public.get_user_org_id() OR public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. PIPELINE_STAGES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS pipeline_stages_select_org ON public.pipeline_stages;
CREATE POLICY pipeline_stages_select_org ON public.pipeline_stages
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

DROP POLICY IF EXISTS pipeline_stages_manage_org ON public.pipeline_stages;
CREATE POLICY pipeline_stages_manage_org ON public.pipeline_stages
  FOR ALL USING (org_id = public.get_user_org_id() OR public.is_staff_user())
  WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. AGENTS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS agents_select_org ON public.agents;
CREATE POLICY agents_select_org ON public.agents
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

DROP POLICY IF EXISTS agents_manage_org ON public.agents;
CREATE POLICY agents_manage_org ON public.agents
  FOR ALL USING (org_id = public.get_user_org_id() OR public.is_staff_user())
  WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. AGENT_CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS agent_campaigns_select_org ON public.agent_campaigns;
CREATE POLICY agent_campaigns_select_org ON public.agent_campaigns
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

DROP POLICY IF EXISTS agent_campaigns_manage_org ON public.agent_campaigns;
CREATE POLICY agent_campaigns_manage_org ON public.agent_campaigns
  FOR ALL USING (org_id = public.get_user_org_id() OR public.is_staff_user())
  WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. AGENT_RUNS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS agent_runs_select_org ON public.agent_runs;
CREATE POLICY agent_runs_select_org ON public.agent_runs
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ORG_ADDONS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'org_addons' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS org_addons_select_org ON public.org_addons;
    CREATE POLICY org_addons_select_org ON public.org_addons
      FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS documents_select_org ON public.documents;
    CREATE POLICY documents_select_org ON public.documents
      FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

    DROP POLICY IF EXISTS documents_manage_org ON public.documents;
    CREATE POLICY documents_manage_org ON public.documents
      FOR ALL USING (org_id = public.get_user_org_id() OR public.is_staff_user())
      WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. LEAD_DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_documents' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS lead_documents_select_org ON public.lead_documents;
    CREATE POLICY lead_documents_select_org ON public.lead_documents
      FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

    DROP POLICY IF EXISTS lead_documents_manage_org ON public.lead_documents;
    CREATE POLICY lead_documents_manage_org ON public.lead_documents
      FOR ALL USING (org_id = public.get_user_org_id() OR public.is_staff_user())
      WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. LEAD_EVENTS (via lead_id)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_events' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS lead_events_select_via_lead ON public.lead_events;
    CREATE POLICY lead_events_select_via_lead ON public.lead_events
      FOR SELECT USING (
        public.is_staff_user()
        OR lead_id IN (SELECT id FROM public.leads WHERE org_id = public.get_user_org_id())
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. GOALS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS goals_select_org ON public.goals;
    CREATE POLICY goals_select_org ON public.goals
      FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());

    DROP POLICY IF EXISTS goals_manage_org ON public.goals;
    CREATE POLICY goals_manage_org ON public.goals
      FOR ALL USING (org_id = public.get_user_org_id() OR public.is_staff_user())
      WITH CHECK (org_id = public.get_user_org_id() OR public.is_staff_user());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. LEAD_SCORES
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_scores' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS lead_scores_select_org ON public.lead_scores;
    CREATE POLICY lead_scores_select_org ON public.lead_scores
      FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_staff_user());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════════
