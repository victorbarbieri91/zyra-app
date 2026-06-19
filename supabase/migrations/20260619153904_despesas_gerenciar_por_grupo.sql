-- Alinha a regra de gerenciamento de DESPESAS ao mesmo critério já usado em
-- RECEITAS e em regras de recorrência: qualquer membro do MESMO GRUPO pode
-- criar/editar/excluir despesas em qualquer escritório do grupo.
--
-- Antes: "Admin and financeiro can manage despesas" exigia
--        user_pode_gerenciar_financeiro (owner/admin/financeiro no escritório).
-- Agora: user_has_access_to_grupo (membro de qualquer escritório do mesmo grupo).
--
-- O isolamento ENTRE GRUPOS continua garantido por user_has_access_to_grupo
-- (que só enxerga o próprio grupo) e pelo trigger validar_mesmo_grupo_ao_mover_lancamento.

DROP POLICY IF EXISTS "Admin and financeiro can manage despesas" ON public.financeiro_despesas;

CREATE POLICY "Membros do grupo gerenciam despesas"
  ON public.financeiro_despesas
  FOR ALL
  USING (user_has_access_to_grupo(escritorio_id))
  WITH CHECK (user_has_access_to_grupo(escritorio_id));
