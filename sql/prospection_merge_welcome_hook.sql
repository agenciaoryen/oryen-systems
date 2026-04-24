-- ═══════════════════════════════════════════════════════════════════════════════
-- PROSPECÇÃO · FUNDE ETAPAS 1 (SAUDAÇÃO) + 2 (CURIOSIDADE) EM 1 SÓ
-- ═══════════════════════════════════════════════════════════════════════════════
-- Motivo: ambas eram day_offset=1, manuais, WhatsApp — 2 cliques pro BDR no
-- mesmo dia, atrito desnecessário. Unificadas em "Abordagem Dia 1" com 6
-- variações que combinam saudação + gancho separadas por "---" no body
-- (a UI renderiza como 2 bubbles de mensagem com botão copy em cada).
--
-- Segurança: só migra sequences com os títulos ORIGINAIS do seed
-- ("Saudação" + "Gancho de curiosidade"). Sequences editadas pelo user
-- ficam intactas.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Atualiza o seed function pra usar o novo formato unificado ───
CREATE OR REPLACE FUNCTION seed_prospection_default_sequence(p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM prospection_sequences
    WHERE org_id = p_org_id AND name = 'Prospecção Cold 5 Dias'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO prospection_sequences (
    org_id, name, description, is_active, exit_on_reply, pause_weekends,
    timezone_mode, business_hours_start, business_hours_end
  )
  VALUES (
    p_org_id,
    'Prospecção Cold 5 Dias',
    'Cadência padrão de 4 etapas: Abordagem Dia 1 + Email + Ligação ICUVA + Último toque.',
    true, true, false,
    'org', '09:00:00', '19:00:00'
  )
  RETURNING id INTO v_sequence_id;

  -- ─── STEP 1: Abordagem Dia 1 (saudação + gancho fundidos) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 1, 1, 'whatsapp', 'manual', 'team_round_robin',
    'Abordagem Dia 1',
    'Duas mensagens em sequência. Envia a saudação, aguarda 5-15s (se lead tiver auto-resposta) ou 2-5 min, depois envia o gancho de curiosidade. Alternar Instagram / Site conforme origem real do lead.',
    jsonb_build_array(
      jsonb_build_object(
        'variant', 'IG-A',
        'label', 'Instagram direta',
        'body', E'Hola {{nombre}}, buenas {{tardes}}. Soy Leonardo.\n\n---\n\nEntré a su perfil de Instagram y quería comentarle algo.'
      ),
      jsonb_build_object(
        'variant', 'IG-B',
        'label', 'Instagram com dúvida',
        'body', E'Hola {{nombre}}, cómo está? Le habla Leonardo.\n\n---\n\nLlegué hasta aquí a través de su Instagram y me quedé con una duda.'
      ),
      jsonb_build_object(
        'variant', 'IG-C',
        'label', 'Instagram chamou atenção',
        'body', E'Buenas {{tardes}} {{nombre}}, soy Leonardo.\n\n---\n\nVi su perfil en Instagram y me llamó la atención.'
      ),
      jsonb_build_object(
        'variant', 'SITE-A',
        'label', 'Site direta',
        'body', E'Hola {{nombre}}, buenas {{tardes}}. Soy Leonardo.\n\n---\n\nLlegué a su contacto por su sitio web y quería comentarle algo.'
      ),
      jsonb_build_object(
        'variant', 'SITE-B',
        'label', 'Site com dúvida',
        'body', E'Hola {{nombre}}, cómo está? Le habla Leonardo.\n\n---\n\nVi su sitio y me quedé con una duda.'
      ),
      jsonb_build_object(
        'variant', 'SITE-C',
        'label', 'Site comentar algo',
        'body', E'Buenas {{tardes}} {{nombre}}, soy Leonardo.\n\n---\n\nLe escribo porque vi su sitio web y quería hacerle un comentario.'
      )
    )
  );

  -- ─── STEP 2: Email automático (Dia 2) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode, agent_slug,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 2, 2, 'email', 'automated', 'bdr_email',
    'team_round_robin',
    'Email de continuidade',
    'Agente BDR Email dispara automaticamente. Não requer ação manual. Serve de referência pra Teresita citar na ligação do Dia 3.',
    jsonb_build_array(
      jsonb_build_object('variant', 'A', 'label', 'assunto padrão',
        'subject', '{{nombre}}, continuación de nuestro WhatsApp',
        'body', 'Hola {{nombre}}, cómo está.

Le escribí hace unos días por WhatsApp sobre una herramienta que armamos para asesores inmobiliarios. Paso por aquí para darle un poco más de contexto por este canal.

En Oryen tenemos una IA que atiende el WhatsApp del asesor las 24 horas, responde a los leads, los califica y agenda las visitas automáticamente. El objetivo es simple, que ningún lead se pierda por demora en la respuesta.

La mayoría de los asesores con los que trabajamos pierde entre un 30% y un 40% de los contactos solo por no responder a tiempo. Es exactamente eso lo que resolvemos.

Si le hace sentido, podemos coordinar una reunión corta por videollamada donde le muestro el sistema aplicado a su operación.

Puede responder este email o escribirme al WhatsApp por el mismo número que usé antes.

Un saludo,
Leonardo
Equipo Oryen')
    )
  );

  -- ─── STEP 3: Ligação com ICUVA (Dia 3) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, outcomes_policy, message_templates
  ) VALUES (
    v_sequence_id, 3, 3, 'call', 'manual', 'team_round_robin',
    'Ligação com ICUVA',
    'Ligação direta usando o WhatsApp + email como pretexto. Aplicar ICUVA (Interesse, Confiança, Urgência, Valor, Autoridade). Ao final, agendar a reunião de demo.',
    jsonb_build_object(
      'answered_positive', 'advance',
      'answered_neutral',  'retry_in_24h',
      'answered_rejected', 'exit:not_interested',
      'voicemail',         'retry_in_4h',
      'no_answer',         'retry_in_4h',
      'busy',              'retry_in_2h',
      'wrong_number',      'exit:bad_data'
    ),
    jsonb_build_array(
      jsonb_build_object('variant', 'APERTURA', 'label', 'abertura da ligação',
        'body', 'Hola, buenas tardes. Hablo con {{nombre}}?

Soy {{seu nome}}, del equipo de Oryen. Le escribimos hace un par de días por WhatsApp y ayer le enviamos un email. Aproveché este momento para llamarlo directamente y aclarar cualquier duda. Tiene 2 minutos ahora?'),
      jsonb_build_object('variant', 'I-INTERES', 'label', 'Interesse (diagnóstico)',
        'body', 'Gracias por el tiempo. Voy directo al punto.

Los leads que le llegan por Instagram, sitio web o WhatsApp, cómo los maneja hoy? Especialmente los que entran fuera del horario, de noche, fin de semana o mientras está atendiendo a otro cliente.'),
      jsonb_build_object('variant', 'V-VALOR', 'label', 'Valor (dimensionar)',
        'body', 'Le entiendo. El tema es que el mercado cambió. El primer asesor que responde al lead casi siempre se queda con la venta, y en promedio los asesores pierden entre un 30% y un 40% de los contactos solo por demora.

Cuántos leads por semana aproximadamente le entran sumando todos los canales?'),
      jsonb_build_object('variant', 'U-URGENCIA', 'label', 'Urgência',
        'body', 'Y hace cuánto viene con esa situación? Es algo que le preocupa ahora, o que puede esperar unos meses?'),
      jsonb_build_object('variant', 'C-CONFIANZA', 'label', 'Confiança (prova)',
        'body', 'Nosotros en Oryen armamos una IA que atiende su WhatsApp las 24 horas, responde a cada lead, lo califica y le agenda la visita en su nombre.

Hoy estamos trabajando con asesores en Brasil, Uruguay y Argentina. Los resultados típicos son de 2 a 3 veces más visitas agendadas, sin tener que contratar ningún SDR humano.'),
      jsonb_build_object('variant', 'A-AUTORIDAD', 'label', 'Autoridade',
        'body', 'Para decidir invertir en este tipo de herramienta en su operación, la decisión pasa solo por usted o hay alguien más involucrado?'),
      jsonb_build_object('variant', 'CIERRE', 'label', 'fechamento',
        'body', 'Perfecto.

Lo que le propongo es una reunión por videollamada donde le muestro el sistema por dentro, aplicado a su operación, con escenarios reales. Le queda mejor mañana por la mañana o por la tarde?')
    )
  );

  -- ─── STEP 4: Último Toque (Dia 5) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 4, 5, 'whatsapp', 'manual', 'team_round_robin',
    'Último toque de encerramento',
    'Depois de 2 dias de respiro. Postura firme, sem insistir. Porta aberta sem forçar.',
    jsonb_build_array(
      jsonb_build_object('variant', 'A', 'label', 'completa',
        'body', 'Hola {{nombre}}.

Intenté contacto en los últimos días porque creo que lo que hacemos en Oryen podría impactar directamente en sus resultados de ventas. Además de la IA que atiende WhatsApp las 24 horas, tenemos CRM, portafolio de inmuebles, sitio web profesional y documentos inteligentes — todo pensado para estructurar la parte comercial del asesor en un único lugar.

Respeto si no es el momento. Le dejo el canal abierto para cuando tenga sentido.

Un abrazo.'),
      jsonb_build_object('variant', 'B', 'label', 'breve',
        'body', 'Hola {{nombre}}.

Intenté contacto porque creo que podemos impactar directamente en sus resultados de ventas. Oryen no es solo IA de WhatsApp — es un ecosistema que estructura la parte comercial del asesor con CRM, portafolio, sitio web y documentos inteligentes.

Respeto si no es prioridad ahora. El canal queda abierto.

Un abrazo.')
    )
  );

  -- Regra de inscrição padrão
  INSERT INTO prospection_enrollment_rules (
    org_id, sequence_id, name, description, priority,
    trigger_event, conditions, is_active
  ) VALUES (
    p_org_id, v_sequence_id,
    'Prospecção manual',
    'Inscreve leads criados manualmente (origem prospeccao_manual) na sequence padrão.',
    10,
    'lead_created',
    jsonb_build_object('source', 'prospeccao_manual'),
    true
  );

  RETURN v_sequence_id;
END;
$$;


-- ─── FUNÇÃO que FUNDE etapas 1+2 em sequences existentes não customizadas ───
CREATE OR REPLACE FUNCTION prospection_merge_welcome_hook(p_sequence_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_step1 RECORD;
  v_step2 RECORD;
  v_new_templates jsonb;
BEGIN
  -- Busca etapas 1 e 2 da sequence
  SELECT * INTO v_step1 FROM prospection_steps
  WHERE sequence_id = p_sequence_id AND position = 1;

  SELECT * INTO v_step2 FROM prospection_steps
  WHERE sequence_id = p_sequence_id AND position = 2;

  -- Só migra se os títulos originais do seed estiverem intactos
  IF v_step1 IS NULL OR v_step2 IS NULL THEN RETURN false; END IF;
  IF v_step1.title != 'Saudação' OR v_step2.title != 'Gancho de curiosidade' THEN
    RETURN false;
  END IF;

  -- Novas variações combinando saudação + gancho (apenas 6 combinações úteis)
  v_new_templates := jsonb_build_array(
    jsonb_build_object(
      'variant', 'IG-A',
      'label', 'Instagram direta',
      'body', E'Hola {{nombre}}, buenas {{tardes}}. Soy Leonardo.\n\n---\n\nEntré a su perfil de Instagram y quería comentarle algo.'
    ),
    jsonb_build_object(
      'variant', 'IG-B',
      'label', 'Instagram com dúvida',
      'body', E'Hola {{nombre}}, cómo está? Le habla Leonardo.\n\n---\n\nLlegué hasta aquí a través de su Instagram y me quedé con una duda.'
    ),
    jsonb_build_object(
      'variant', 'IG-C',
      'label', 'Instagram chamou atenção',
      'body', E'Buenas {{tardes}} {{nombre}}, soy Leonardo.\n\n---\n\nVi su perfil en Instagram y me llamó la atención.'
    ),
    jsonb_build_object(
      'variant', 'SITE-A',
      'label', 'Site direta',
      'body', E'Hola {{nombre}}, buenas {{tardes}}. Soy Leonardo.\n\n---\n\nLlegué a su contacto por su sitio web y quería comentarle algo.'
    ),
    jsonb_build_object(
      'variant', 'SITE-B',
      'label', 'Site com dúvida',
      'body', E'Hola {{nombre}}, cómo está? Le habla Leonardo.\n\n---\n\nVi su sitio y me quedé con una duda.'
    ),
    jsonb_build_object(
      'variant', 'SITE-C',
      'label', 'Site comentar algo',
      'body', E'Buenas {{tardes}} {{nombre}}, soy Leonardo.\n\n---\n\nLe escribo porque vi su sitio web y quería hacerle un comentario.'
    )
  );

  -- Atualiza etapa 1 com conteúdo combinado
  UPDATE prospection_steps
  SET title = 'Abordagem Dia 1',
      instruction = 'Duas mensagens em sequência. Envia a saudação, aguarda 5-15s (se lead tiver auto-resposta) ou 2-5 min, depois envia o gancho de curiosidade. Alternar Instagram / Site conforme origem real do lead.',
      message_templates = v_new_templates
  WHERE id = v_step1.id;

  -- Move enrollments que estavam na etapa 2 pra etapa 1 (serão reexecutadas)
  -- Se estava em etapa 2, o BDR já mandou a saudação. Avança pra etapa 3 (era email, vai virar 2).
  UPDATE prospection_enrollments
  SET current_step_position = 3  -- será renumerada abaixo pra 2
  WHERE sequence_id = p_sequence_id AND current_step_position = 2;

  -- Atualiza tasks da etapa 2 que estavam pending → marca como skipped
  UPDATE prospection_tasks
  SET status = 'skipped',
      notes = COALESCE(notes, '') || ' [merged into step 1]'
  WHERE step_id = v_step2.id
    AND status IN ('pending', 'in_progress', 'overdue', 'queued');

  -- Deleta etapa 2
  DELETE FROM prospection_steps WHERE id = v_step2.id;

  -- Renumera: etapas 3+ decrementam position em 1
  UPDATE prospection_steps
  SET position = position - 1
  WHERE sequence_id = p_sequence_id AND position > 2;

  -- Renumera enrollments: quem estava em pos >= 3 decrementa 1
  UPDATE prospection_enrollments
  SET current_step_position = current_step_position - 1
  WHERE sequence_id = p_sequence_id AND current_step_position > 2;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION prospection_merge_welcome_hook IS
  'Funde etapas 1 (Saudação) + 2 (Gancho de curiosidade) em uma só (Abordagem Dia 1). Só atua em sequences com os títulos originais do seed (preserva customizações).';


-- ─── Roda a fusão em todas sequences existentes não customizadas ───
DO $$
DECLARE
  v_seq RECORD;
BEGIN
  FOR v_seq IN
    SELECT id FROM prospection_sequences
    WHERE name = 'Prospecção Cold 5 Dias'
  LOOP
    PERFORM prospection_merge_welcome_hook(v_seq.id);
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM — próxima etapa de trabalho: CRUD APIs de sequences e steps
-- ═══════════════════════════════════════════════════════════════════════════════
