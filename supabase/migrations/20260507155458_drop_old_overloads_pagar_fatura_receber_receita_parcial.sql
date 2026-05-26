-- Remove os overloads antigos das funções pagar_fatura e receber_receita_parcial.
-- As migrations 20260507000001 e 20260507000002 adicionaram novos parâmetros
-- (p_gerar_saldo), o que cria uma assinatura nova ao invés de substituir a antiga.
-- Sem este DROP, o resolver de RPC do PostgREST pode escolher a versão errada
-- ou levantar "function is not unique" para chamadas sem o novo parâmetro.

DROP FUNCTION IF EXISTS public.pagar_fatura(
  uuid, numeric, date, text, uuid, uuid, text, text, date
);

DROP FUNCTION IF EXISTS public.receber_receita_parcial(
  uuid, numeric, forma_pagamento_enum, uuid, date
);

DROP FUNCTION IF EXISTS public.receber_receita_parcial(
  uuid, numeric, date, uuid, text, date
);
