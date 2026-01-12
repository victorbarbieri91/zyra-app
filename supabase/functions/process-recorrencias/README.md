# Edge Function: process-recorrencias

Processa recorrências de tarefas e eventos automaticamente, criando ocorrências para os próximos 45 dias.

## Funcionamento

- **Execução**: Diária às 00:00 (via Cron)
- **Janela**: Cria ocorrências para os próximos 45 dias
- **Inteligente**: Não duplica ocorrências já criadas

## Como configurar o Cron

### Opção 1: Via Dashboard do Supabase

1. Acesse o Dashboard do Supabase
2. Vá em **Database** → **Cron Jobs**
3. Clique em **Create a new cron job**
4. Configure:
   - **Name**: `process-recorrencias-daily`
   - **Schedule**: `0 0 * * *` (todo dia às 00:00)
   - **Command**:
   ```sql
   SELECT
     net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recorrencias',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )
     ) as request_id;
   ```

### Opção 2: Via SQL (se pg_cron estiver habilitado)

```sql
-- Remover job existente se houver
SELECT cron.unschedule('process-recorrencias-daily');

-- Criar novo job
SELECT cron.schedule(
  'process-recorrencias-daily',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-recorrencias',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) as request_id;
  $$
);
```

## Deploy da Edge Function

```bash
# Deploy para produção
npx supabase functions deploy process-recorrencias

# Testar localmente
npx supabase functions serve process-recorrencias

# Testar manualmente (via curl)
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recorrencias \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Variáveis de Ambiente Necessárias

A Edge Function usa automaticamente:
- `SUPABASE_URL` - URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (admin)

Essas variáveis são injetadas automaticamente pelo Supabase.

## Logs

Para ver os logs da função:
1. Dashboard → **Edge Functions** → `process-recorrencias`
2. Aba **Logs**

## Frequências Suportadas

- **Diária**: A cada X dias (com opção de apenas dias úteis)
- **Semanal**: Dias específicos da semana
- **Mensal**: Dia específico do mês
- **Anual**: Data específica do ano
