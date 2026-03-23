

## Fix: Posição não atualiza ao importar CSV de Produto

### Problema raiz

Há **2 bugs** impedindo a posição de funcionar:

**Bug 1 — Import via botão principal:** Quando o CSV de produto é importado pelo botão "Importar CSV" (sem `targetAdsDataId`), o `importProductCSV` tenta encontrar o row existente por `nome_produto_csv` exato + período. Se o nome no CSV do produto difere do nome no CSV geral (ex: truncado, formato diferente), não encontra match → cria um **novo row** com posição, enquanto o row antigo continua sem. Resultado: dois rows do mesmo produto, o original sem posição.

**Bug 2 — Import via botão do card:** Quando clica "Importar CSV" no box de posição do card, chama `handlePositionFile` → `importProductCSV(text, positionTarget)`. Isso funciona corretamente SE o parser extrair a posição. Porém, após o update no DB, o `fetchData()` recarrega os dados mas o card pode não refletir porque `posicao_importada` depende de `hasRealPosition` que depende de `avgPos !== null`. Se o parser não encontra a coluna de posição (por variação no header), `avgPos = null` e nada muda.

### Correções

#### 1. `src/hooks/useAdsData.ts` — Dedup mais inteligente no `importProductCSV`

Quando importado **sem target** (via botão principal), adicionar busca por `shopee_product_id` SEM restrição de período (o product ID é mais confiável que o nome):

```typescript
// Busca 1: por shopee_product_id (sem período)
if (m.shopeeProductId) {
  const byId = await supabase.from('ads_data').select('id')
    .eq('user_id', user.id).eq('shopee_product_id', m.shopeeProductId).limit(1);
  existingId = byId.data?.[0]?.id;
}
// Busca 2: por nome + período (existente)
// Busca 3: fuzzy — normalize(nome) contains
```

Quando encontrar um row existente, fazer **UPDATE** com posição e métricas do product CSV em vez de criar novo row.

#### 2. `src/lib/shopeeAdsParser.ts` — Ampliar detecção da coluna de posição

O `posCol` atual busca termos normalizados. Adicionar fallback: se `posCol === -1`, tentar encontrar pelo **índice fixo** (coluna 20, 0-indexed) quando o CSV tem 21+ colunas, verificando se o header contém "posi" ou "média":

```typescript
if (posCol === -1 && headerCols.length >= 21) {
  // Fallback: checar coluna 20 diretamente
  const col20 = (headerCols[20] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (col20.includes('posi') || col20.includes('media') || col20.includes('medio')) {
    posCol = 20;
  }
}
```

#### 3. `src/hooks/useAdsData.ts` — Log de debug no import

Adicionar `console.log` temporário mostrando `avgPos` extraído e `existingId` encontrado para facilitar debug:

```typescript
console.log('[AdsImport] Product CSV:', { avgPos, hasRealPosition, existingId, productName: m.shopeeProductName });
```

#### 4. `src/hooks/useAdsData.ts` — Garantir que update com target sempre salva posição

No fluxo com `targetAdsDataId`, o update atual já salva `posicao_media` e `posicao_importada`. Mas precisa garantir que mesmo quando `avgPos === null`, o update não sobrescreva dados existentes de posição se o row já tinha posição de um import anterior. Adicionar guard:

```typescript
// Só sobrescrever posição se o novo CSV trouxer posição real
...(hasRealPosition ? { posicao_media: avgPos, posicao_importada: true } : {}),
```

### Arquivos alterados
- `src/hooks/useAdsData.ts` — dedup inteligente + guard de posição
- `src/lib/shopeeAdsParser.ts` — fallback de coluna de posição

