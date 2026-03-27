

## Corrigir erro de importação do CSV geral de Ads

### Problema
Erro `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification` ao importar CSV geral.

### Causa raiz
A migration `20260325164949` criou um **índice único parcial**:
```sql
CREATE UNIQUE INDEX idx_ads_data_unique_period 
ON ads_data (user_id, nome_produto_csv, periodo_inicio, periodo_fim)
WHERE nome_produto_csv IS NOT NULL;
```

O PostgreSQL **não permite** `ON CONFLICT` com índices parciais via Supabase client. O `upsert` com `onConflict: 'user_id,nome_produto_csv,periodo_inicio,periodo_fim'` falha porque precisa de uma constraint real (não um índice parcial).

### Solução (2 partes)

**1. Migration: Criar uma constraint UNIQUE real**

Dropar o índice parcial e criar uma constraint completa:
```sql
DROP INDEX IF EXISTS idx_ads_data_unique_period;
ALTER TABLE ads_data ADD CONSTRAINT uq_ads_data_period 
  UNIQUE (user_id, nome_produto_csv, periodo_inicio, periodo_fim);
```

**2. Código: Ajustar o fallback em `useAdsData.ts`**

Alterar a estratégia de upsert (linhas 246-250) para usar a nova constraint. Também adicionar tratamento de erro mais resiliente: se o upsert falhar, fazer delete + insert como fallback (o padrão que já funciona no import por produto).

```typescript
// Delete existing data for this period first, then insert
await supabase.from('ads_data').delete()
  .eq('user_id', user.id)
  .eq('periodo_inicio', uniqueRows[0]?.periodo_inicio)
  .eq('periodo_fim', uniqueRows[0]?.periodo_fim);

const { error } = await supabase.from('ads_data').insert(uniqueRows);
```

A abordagem delete+insert é mais segura porque:
- Funciona independente de constraints
- Limpa dados antigos do mesmo período
- Evita duplicatas naturalmente

### Arquivos modificados
- Nova migration SQL (criar constraint UNIQUE real)
- `src/hooks/useAdsData.ts` (linhas 246-258)

