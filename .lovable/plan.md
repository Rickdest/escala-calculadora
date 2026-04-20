

## Objetivo

Aplicar na aba **Tendência do detalhe do produto** (`/products/:id`) o mesmo design e profundidade de insights que já está na **Análise de demanda** da aba Análise (`TrendSearchCard`).

## Diagnóstico do que está diferente hoje

| Feature | Análise (TrendSearchCard) | Tendência do produto (ProductTrendTab) |
|---|---|---|
| Hero "Potencial de mercado 0-100" | ✅ | ❌ |
| Grid 6 mini-cards (Tendência, Momento, Volatilidade, Mês atual, Vs ano passado, Próx 30d, Concorrência) | ✅ | ❌ (só 3 cards: Tend 90d, Pico, Próx pico) |
| Banner de ação interpretado | ✅ | ❌ |
| Chips de **período** (7d/30d/90d/12m/5y) | ✅ | ❌ (fixo em 5y) |
| Comparativo multi-termo (até 5) | ✅ | ❌ |
| Forecast 3m no gráfico | ✅ | ❌ |
| Accordion **Cidades** lazy | ✅ | ❌ (só estados) |
| Accordion **Países** lazy | ✅ | ❌ |
| Categoria detectada (chip) | ✅ | ❌ |
| Tooltip rico no chart | ✅ (formatter genérico) | ✅ (custom + vs média) |
| Termos relacionados (rising/top) | ✅ | ✅ |
| Ciclo sazonal + Regiões | ✅ | ✅ |
| Editor de termo (override) | ❌ | ✅ |
| Palavras-chave Shopee (volume real) | ❌ | ✅ |
| Copys com "Google" | ❌ (limpo) | ⚠️ menciona "Google" 3x |

## Estratégia

A maneira mais segura e consistente é **reusar o `TrendSearchCard`** dentro da aba Tendência do produto, com 2 acoplamentos extras:

1. **Pré-popula o input** com o termo do produto (`keyword` atual ou `productName`) e dispara busca automática no mount
2. **Adiciona uma faixa de "termo do produto"** acima do card, com botão **"Personalizar termo"** (mantém o feature do override existente, persistindo em `products.trend_keyword_override`)
3. **Mantém a seção "Palavras-chave Shopee — volume real"** abaixo (única funcionalidade que o card avulso não tem, vem de `shopee_ads_by_product`)

Isso entrega instantaneamente: hero score, 6 cards, período selector, comparativo, forecast, cidades, países, categoria, copys limpas. Sem duplicar código.

## Plano de implementação

### 1. Generalizar `TrendSearchCard` aceitando props opcionais

`src/components/products/TrendSearchCard.tsx`:
- Aceitar props opcionais:
  - `initialKeyword?: string` — pré-popula input e dispara busca no mount
  - `variant?: "standalone" | "embedded"` — quando `embedded`, esconde o header "Análise de demanda / Descubra o potencial..." (já está no contexto do produto) e remove a borda lateral primária
  - `extraFooter?: React.ReactNode` — slot pra renderizar a seção de palavras-chave Shopee abaixo dos accordions
- `useEffect` no mount: se `initialKeyword`, set input + dispara `handleSubmit(initialKeyword)`

### 2. Refatorar `ProductTrendTab`

`src/components/products/trend/ProductTrendTab.tsx`:
- Remover: header gigante, 3 cards de diagnóstico, gráfico custom, ciclo, regiões, cards de related (tudo migra pro `TrendSearchCard`)
- **Manter**: estado de loading inicial / vazio / erro do hook `useProductTrend` (pra orquestrar o primeiro fetch persistido), aviso de baixa qualidade, editor de termo (override persistido)
- Quando tiver `keyword`, renderizar:
  ```
  <FaixaTermoProduto 
    keyword={keyword} 
    keywordOverride={keywordOverride}
    onEditTerm={...}
    onRefresh={...}
    lastCapture={...}
  />
  <TrendSearchCard 
    initialKeyword={keyword}
    variant="embedded"
    extraFooter={shopeeKeywords.length > 0 ? <ShopeeKeywordsSection /> : null}
  />
  ```
- O `ShopeeKeywordsSection` é um pequeno componente local que renderiza o bloco "Palavras-chave Shopee — volume real" já existente (reaproveita JSX das linhas 622–653)

### 3. Limpar copys

No `ProductTrendTab` (faixa do termo) e no aviso de baixa qualidade:
- "O Google Trends não retornou histórico" → "Não encontramos histórico de demanda"
- "Esse termo não retornou histórico no Google" → "Esse termo não tem histórico de demanda suficiente"
- "Buscas crescendo no Google" (já no card antigo) → será substituído pelo `TrendSearchCard` que diz "Termos bombando"

### 4. Pré-busca inteligente

Quando o usuário entra na aba pela 1ª vez:
- `useProductTrend` carrega do banco (cache 7d) — dá o `keyword` extraído + override
- Assim que `keyword` está disponível, `TrendSearchCard` dispara busca automática usando esse termo
- Resultado: usuário vê insights ricos imediatamente, sem precisar clicar "Analisar"

Trade-off: 1 chamada extra ao Trends por visita (mitigado pelo cache em memória de 8 buscas do `useTrendSearch`)

### 5. Sincronizar override

Quando usuário edita o termo na faixa:
- `setKeywordOverride(newTerm)` persiste em `products.trend_keyword_override` (já implementado)
- Logo após, dispara `TrendSearchCard.search(newTerm)` pra atualizar os insights ricos

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/products/TrendSearchCard.tsx` | Adicionar props `initialKeyword`, `variant`, `extraFooter`; auto-search no mount; ocultar header quando `embedded` |
| `src/components/products/trend/ProductTrendTab.tsx` | Refatorar: manter só faixa-termo + estados de loading/erro/lowQuality + override; delegar visualização ao `TrendSearchCard` embedded; mover bloco Shopee pra `extraFooter` |

Sem migrações. Sem alterações no backend. Sem alteração no `useProductTrend` ou `useTrendSearch`.

## Trade-offs

- ✅ Paridade visual e de insights 1:1 entre as duas telas
- ✅ Zero duplicação de código (uma fonte da verdade pra UI de trends)
- ✅ Mantém features exclusivas do produto: override persistido + palavras Shopee
- ✅ Copys 100% no idioma do app (sem citar Google)
- ⚠️ 1 chamada extra ao Trends ao abrir a aba (cache 8-itens mitiga em revisitas)
- ⚠️ `TrendSearchCard` cresce em props (+3) mas continua coeso

