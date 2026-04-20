

O usuário pediu minha sugestão entre as 3 opções. Recomendo a **Opção 1 (top + rising completo)** porque:

1. **Custo de implementação é o mesmo** — o endpoint `/api/widgetdata/relatedsearches` retorna ambos no mesmo payload. Não vale a pena pegar só metade.
2. **Cada um resolve um problema diferente:**
   - **Rising (em alta)** = oportunidades de produtos novos pra testar
   - **Top (mais buscadas)** = otimização de SEO/título dos produtos atuais
3. **Resolve o problema do "low quality"** — quando o termo extraído tem pouco volume, as relacionadas viram sugestões REAIS (vindas do Google) em vez de palpites do nosso algoritmo de remover palavras.
4. O dashboard global de catálogo (opção 3) é uma boa segunda etapa, mas só faz sentido depois que cada produto tiver dados confiáveis individualmente.

## Plano: implementar top + rising

### Backend (`fetch-product-trends/index.ts`)
- Adicionar 2ª chamada ao `/api/widgetdata/relatedsearches` (já vem token no mesmo response do explore que usamos)
- Salvar resultados em `product_trends` com:
  - `source: 'google_related_top'` e `source: 'google_related_rising'`
  - `keyword` = termo relacionado
  - `interest_score` = valor (top: 0-100; rising: % crescimento, ou 9999 pra "Breakout")
  - `metadata: { type, growth_label }` pra guardar "Breakout" quando aplicável
- Se a chamada principal falhar mas a related funcionar (ou vice-versa), retornar parcial em vez de tudo nada

### Hook (`useProductTrend.ts`)
- Expor `relatedTop: RelatedKeyword[]` e `relatedRising: RelatedKeyword[]`
- Quando `lowQuality === true`, popular `suggestions` automaticamente com top 3 do `relatedTop` (em vez do algoritmo atual de cortar palavras)

### UI (`ProductTrendTab.tsx`)
- Nova seção **"Oportunidades de mercado"** abaixo dos cards de diagnóstico, em 2 colunas (md+) / stack (mobile):
  - **🔥 Em alta agora** (rising): badge "BOMBANDO" pra Breakout/>500%, badge laranja pra >100%, % verde pra 25-100%
  - **🔍 Buscas populares** (top): score 0-100 com barra de progresso compacta
- Cada item tem botão de "lupa" → vira `keywordOverride` e reanalisa com 1 clique
- Esconder a seção se ambas listas vierem vazias (termos muito de nicho)

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/fetch-product-trends/index.ts` | Buscar `relatedsearches`, persistir 2 sources novos, retornar `related_top` + `related_rising` no response |
| `src/hooks/useProductTrend.ts` | Carregar e expor `relatedTop`/`relatedRising`; usar como sugestões quando lowQuality |
| `src/components/products/trend/ProductTrendTab.tsx` | Nova seção "Oportunidades" com 2 colunas + clique pra reanalisar |

### Trade-offs
- **+1 request por análise** → custo negligível (mesma sessão de cookies, mesmo isolate)
- **Listas vazias em nichos pequenos** → tratamento gracioso (esconde seção)
- **Não mexe no schema** — `product_trends` já tem `keyword`, `interest_score`, `source`, `metadata`

