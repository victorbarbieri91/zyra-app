# Módulo: Outros

> Gerado automaticamente em: 2026-02-05
> Tabelas: 1

## Descrição
Outros

---

## Tabelas

### sistema_indices_economicos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| indice | text | Sim | - |
| codigo_bcb | integer | Sim | - |
| mes_referencia | date | Sim | - |
| valor | numeric | Sim | - |
| acumulado_12m | numeric | Não | - |
| acumulado_ano | numeric | Não | - |
| fonte | text | Não | bcb::text |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `indice`: Tipo do índice: ipca, ipca_e, inpc, igpm, selic
- `codigo_bcb`: Código da série no SGS/BCB (433=IPCA, 10764=IPCA-E, 188=INPC, 189=IGP-M, 11=SELIC)
- `mes_referencia`: Mês de referência do índice (sempre primeiro dia do mês)
- `valor`: Variação percentual do mês
- `acumulado_12m`: Variação acumulada nos últimos 12 meses
- `acumulado_ano`: Variação acumulada no ano corrente

**Constraints**:
- `indice`: indice = ANY (ARRAY['ipca'::text, 'ipca_e'::text, 'inpc'::text, 'igpm'::text, 'selic'::text])

---

