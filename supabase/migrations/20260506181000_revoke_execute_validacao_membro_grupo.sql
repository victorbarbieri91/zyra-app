-- =============================================================================
-- Revoga EXECUTE de anon/authenticated para as funções SECURITY DEFINER de
-- validação criadas em 20260506180000_validar_responsavel_membro_grupo.sql.
--
-- Motivo: o advisor de segurança do Supabase detectou que essas funções
-- SECURITY DEFINER eram callable via /rest/v1/rpc/* pelo role anon.
-- Triggers continuam funcionando normalmente — chamam as funções no contexto
-- do trigger, sem depender do privilégio EXECUTE do role do cliente.
-- =============================================================================

REVOKE ALL ON FUNCTION public.is_membro_grupo_escritorio(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_validar_agenda_responsaveis()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_validar_responsavel_simples()        FROM PUBLIC, anon, authenticated;

-- Mantém EXECUTE para postgres e service_role (contas privilegiadas).
GRANT EXECUTE ON FUNCTION public.is_membro_grupo_escritorio(uuid, uuid) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.tg_validar_agenda_responsaveis()        TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.tg_validar_responsavel_simples()        TO postgres, service_role;
