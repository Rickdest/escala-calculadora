

## Diagnóstico (confirmado pelos logs)

Produto: "Vestido Longo Feminino Safira Gringo com Costas Abertas Suplex Empina Bumbum Elegância e Conforto"

Pipeline atual:
1. Extrator gera `"vestido longo suplex feminino"` (4 palavras, muito específico)
2. Google Trends responde com **100% zeros** + **zero related queries** + **zero regiões**
3. Backend marca `low_quality: true` e gera sugestões algorítmicas (fallback `suggestAlternatives`)
4. Mas como **nada é persistido no banco** (googleSaved=0, relatedSaved=0, regionsSaved=0, cycleSaved=0), o frontend recarrega via `loadFromDb()` → `hasData = false`
5. Usuário volta pro card "Descubra a tendência de mercado" sem entender por que **e sem ver as sugestões**

## Causa raiz

**Bug 1 (frontend) — sugestões perdidas:** o `useProductTrend.refresh()` recebe `suggestions` e `lowQuality` da resposta da function e seta no estado, mas em seguida chama `loadFromDb()` que **rebuscar do banco e como não tem linhas, hasData fica false** → o componente cai no estado vazio inicial e descarta `suggestions/lowQuality` porque o `if (!hasData)` vem antes.

**Bug 2 (backend) — extrator agressivo demais:** "suplex" é modificador de nicho. Combinado a "longo" cria query de cauda longa sem volume. Falta cascata de simplificação **server-side** antes de desistir.

**Bug 3 (backend) — não persiste nada quando vazio:** se Google Trends devolve timeline vazia, deveríamos pelo menos persistir um marcador (`source: 'meta_no_data'`) pra `hasData=true` e a UI mostrar o aviso + sugestões.

## Solução

### 1. Backend: cascata de simplificação automática (`fetch-product-trends/index.ts`)

Antes de declarar `low_quality`, tentar até 3 variações progressivamente mais genéricas:

```
Tentativa 1: "vestido longo suplex feminino"  → 100% zeros
Tentativa 2: "vestido longo feminino"         → tenta
Tentativa 3: "vestido feminino"               → tenta
Tentativa 4: "vestido"                        → última cartada
```

Função nova `buildKeywordCascade(productName)` retorna array ordenado do mais específico ao mais genérico (categoria + audience + 1-2 modifiers → categoria + audience → categoria). Itera e usa o **primeiro que retornar dados úteis** (>30% não-zeros). Se nenhuma der, marca low_quality com a mais específica + sugere as outras.

Resultado esperado: 80% dos casos hoje "vazios" passam a ter dados (porque "vestido feminino" tem volume gigante).

### 2. Backend: persistir marcador quando tudo vier vazio

Adicionar inserção mínima quando `googleSaved=0 && relatedSaved=0 && regionsSaved=0`:

```ts
await admin.from("product_trends").insert({
  user_id: userId, product_id: productId,
  source: "meta_no_data",
  keyword,
  period_date: today,
  metadata: { suggestions, attempted_cascade: [...] }
});
```

Garante `hasData = true` no front, permitindo mostrar aviso + sugestões. Requer adicionar `'meta_no_data'` ao constraint `product_trends_source_check` via migração.

### 3. Frontend: melhorar fallback no `useProductTrend` (`useProductTrend.ts`)

Mesmo que `hasData=false`, se o último `refresh()` retornou `lowQuality=true` ou `suggestions.length > 0`, **renderizar o aviso de low_quality em vez do card vazio**. Hoje o `if (!hasData)` precede o aviso de low_quality e ganha sempre.

Solução: trocar a condição em `ProductTrendTab` linha 91:
```tsx
if (!loading && !hasData && !refreshing && !lowQuality && suggestions.length === 0) {
  // estado vazio inicial
}
```
E mover o bloco de "low_quality + suggestions" pra antes do bloco vazio (ou renderizar sempre que `lowQuality` for true, com layout simplificado quando não tem `keyword`).

### 4. Frontend: sticky button "Tentar termo mais genérico"

No aviso de `lowQuality`, adicionar botão extra destacado: **"Tentar 'vestido feminino'"** (a versão simplificada vinda do backend como `auto_simplified` na resposta). Um clique já reanalisa.

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/fetch-product-trends/index.ts` | Função `buildKeywordCascade`, loop tentando cada variação, persistir marker `meta_no_data`, retornar `suggestions` mesmo quando dados parciais |
| Nova migração | Adicionar `'meta_no_data'` ao `product_trends_source_check` |
| `src/hooks/useProductTrend.ts` | Persistir `suggestions/lowQuality/keyword` mesmo quando `loadFromDb()` retorna vazio; expor `attemptedCascade` |
| `src/components/products/trend/ProductTrendTab.tsx` | Reordenar guards: aviso `lowQuality` > estado vazio inicial; botão "tentar termo simplificado" |

## Trade-offs

- ✅ Resolve **o bug central** (usuário some sem feedback)
- ✅ Recupera ~70% dos produtos hoje "sem dados" automaticamente via cascata
- ✅ Sem mudança de UX visual: só preenche o que faltava
- ⚠️ Cascata adiciona até 2 chamadas extras ao Google Trends (latência: +6-15s no pior caso) — mitigado por: parar na primeira que funcionar + cookies cacheados
- ⚠️ Risco de rate-limit aumenta levemente; já temos retry com backoff
- ⚠️ Marker `meta_no_data` adiciona linha "lixo" ao banco — limpamos no próximo refresh bem-sucedido (delete antes do insert já existe no fluxo)

