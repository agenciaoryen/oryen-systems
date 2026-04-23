-- Fix: adiciona policy de INSERT em lead_events pra usuários autenticados.
--
-- Problema: a configuração original em security_rls_complete.sql só criava
-- policies de SELECT e de service_role (ALL). INSERT direto do dashboard (com
-- JWT do usuário) retornava 403 Forbidden silencioso.
-- Isso bloqueava o drag-and-drop do Kanban (que insere stage_change via
-- supabase client), o painel "Ações de Venda" no perfil do lead (call_made,
-- meeting_attended, proposal_sent) e notas manuais.
-- Eventos do SDR continuavam funcionando porque rodam no servidor com service
-- role (bypassa RLS).
--
-- Fix: permitir INSERT desde que o lead pertença à org do usuário.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'lead_events_insert_via_lead' AND tablename = 'lead_events'
  ) THEN
    CREATE POLICY lead_events_insert_via_lead ON public.lead_events
      FOR INSERT
      WITH CHECK (
        lead_id IN (SELECT id FROM public.leads WHERE org_id = public.get_user_org_id())
      );
  END IF;
END $$;
