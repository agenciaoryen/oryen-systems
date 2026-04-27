-- ═══════════════════════════════════════════════════════════════════════════════
-- prospection_capacity_optout.sql
-- Permite que daily_task_capacity = 0 — sinal de "opt-out" do user.
-- O motor (lib/prospection/engine.ts → resolveAssignee) ignora users com 0.
-- Caso típico: admin que não atua como BDR mas precisa rodar o motor.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_daily_task_capacity_check;
ALTER TABLE users ADD CONSTRAINT users_daily_task_capacity_check
  CHECK (daily_task_capacity >= 0 AND daily_task_capacity <= 500);

COMMENT ON COLUMN users.daily_task_capacity IS
  'Tarefas diárias máximas atribuídas a este user pelo motor de prospecção. 0 = opt-out.';
