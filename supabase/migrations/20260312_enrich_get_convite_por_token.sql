-- Enriquece get_convite_por_token para retornar nome do escritório e cargo
-- Necessário porque usuários anônimos não têm acesso via RLS às tabelas escritorios e escritorios_cargos
DROP FUNCTION IF EXISTS get_convite_por_token(UUID);

CREATE OR REPLACE FUNCTION get_convite_por_token(p_token UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  expira_em TIMESTAMPTZ,
  aceito BOOLEAN,
  escritorio_id UUID,
  cargo_id UUID,
  escritorio_nome TEXT,
  cargo_nome TEXT,
  cargo_cor TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.email,
    c.expira_em,
    c.aceito,
    c.escritorio_id,
    c.cargo_id,
    e.nome AS escritorio_nome,
    COALESCE(ec.nome_display, 'Membro') AS cargo_nome,
    COALESCE(ec.cor, '#64748b') AS cargo_cor
  FROM escritorios_convites c
  LEFT JOIN escritorios e ON e.id = c.escritorio_id
  LEFT JOIN escritorios_cargos ec ON ec.id = c.cargo_id
  WHERE c.token = p_token;
END;
$$;
