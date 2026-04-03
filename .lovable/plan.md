

## Plano: Corrigir status dos anúncios (filtros mostrando "Ativo" incorretamente)

### Problema

O backend (`shopee-ads`) calcula corretamente o status de cada campanha via `mapCampaignStatus` (active/paused/ended), mas **não salva esse status no banco**. A tabela `shopee_ads_by_product` não tem coluna `status`. No frontend, `buildApiAdsDataFromRows` usa um fallback ingênuo:

```typescript
status: r.item_name?.includes('Pausado') ? 'paused' : 'active'
```

Resultado: tudo aparece como "Ativo" mesmo que na Shopee esteja pausado ou encerrado.

### Correção

#### 1. Migration: adicionar coluna `status` à tabela `shopee_ads_by_product`
- `ALTER TABLE shopee_ads_by_product ADD COLUMN status text DEFAULT 'ended'`

#### 2. Backend: salvar status no upsert (`shopee-ads/index.ts`)
- Linha ~573: adicionar `status: c.status` no objeto do upsert
- O status já existe em `c.status` vindo de `processCampaignEntries`

#### 3. Frontend: usar status real do banco (`useApiAdsData.ts`)
- Substituir o fallback naive por: `status: r.status || 'ended'`
- Na agregação por item_id, priorizar status: se qualquer campanha do item é `active` → `active`; se qualquer é `paused` → `paused`; senão → `ended`

#### 4. Frontend: adicionar filtro por status no dashboard (`ApiAdsDashboard.tsx`)
- Adicionar chips de filtro por status inspirados na imagem de referência (Tudo, Em andamento, Pausado, Encerrado)
- Filtrar a lista de produtos pelo status selecionado
- Mostrar contagem por status nos chips

### Arquivos alterados

```
Migration SQL (nova coluna status)
supabase/functions/shopee-ads/index.ts      — salvar status no upsert
src/hooks/useApiAdsData.ts                  — usar status real + lógica de agregação
src/components/roas/ApiAdsDashboard.tsx      — chips de filtro por status
```

