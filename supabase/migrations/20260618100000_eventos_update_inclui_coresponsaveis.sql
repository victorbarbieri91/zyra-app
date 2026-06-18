-- Corrige incoerência de RLS: co-responsáveis (responsaveis_ids) podiam VER eventos mas não ATUALIZAR.
-- A policy de SELECT já incluía responsaveis_ids; a de UPDATE não. Resultado: quem era apenas
-- co-responsável conseguia abrir o evento na agenda, mas ao "marcar como concluído" o UPDATE era
-- filtrado pela RLS (0 linhas) SEM erro — e o app exibia um falso "concluído".
-- Alinha a policy de UPDATE de agenda_eventos com a de agenda_tarefas / agenda_audiencias.
DROP POLICY IF EXISTS "Usuarios podem atualizar eventos onde sao responsaveis" ON public.agenda_eventos;

CREATE POLICY "Usuarios podem atualizar eventos onde sao responsaveis"
ON public.agenda_eventos
FOR UPDATE
USING (
  user_has_access_to_grupo(escritorio_id)
  AND (
    criado_por = auth.uid()
    OR responsavel_id = auth.uid()
    OR auth.uid() = ANY (responsaveis_ids)
  )
);
