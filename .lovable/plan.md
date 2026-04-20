

## Diagnóstico

Pelos prints (image-254/255/257) ao trocar pra **30d/12m**, o gráfico aparece com **1 ponto solo** ou quase em branco, mesmo com dados:

1. **Bug do gráfico em janelas curtas/médias**: hoje o `<Area>` usa `connectNulls={false}` — quando o `chartWithForecast` é montado pra séries **sem forecast** (qualquer janela ≠ 5y), o array `real` tá certo, mas o `<Area>` da série `forecast` (toda `null`) força um redraw que limita o domínio. Soma-se ao `tickFormatter` que pra 30d formata `"jan 15"` e o `minTickGap={40}` no eixo estreito mata todos ticks.
2. **Y domain `[0, 100]` fixo**: Trends às vezes retorna valores baixos (ex: 5–20) e a área fica esmagada no fundo, parecendo ponto único.
3. **Linha de média (`ReferenceLine`)** sumiu no print — provável que o `stats.avg` tá baixo e alinhado com o eixo.

## Copys (precisam ser do app, não citar Google)

Auditoria das menções a "Google" / termos técnicos no `TrendSearchCard.tsx`:
- ✅ Já não cita "Google Trends" diretamente
- ⚠️ Header diz "Pesquisar tendência de mercado" — bom
- ⚠️ Microcopy "interesse" / "pico 100" — Trends usa escala 0-100 que confunde leigo. Trocar por linguagem do app: "Demanda", "Buscas", "Procura"
- ⚠️ "projeção 3m" — manter mas explicar
- ⚠️ "Janela" (chip) — trocar por "Período"

## O que falta de informação (mais valor sem chamada extra)

Hoje mostramos: tendência, momentum, sazonalidade, gráfico, ciclo, regiões, cidades, países, em alta, populares. **Falta:**

1. **Score geral 0-100** ("Potencial de mercado") — composto de: nível médio + slope + momentum. Card destaque grande no topo.
2. **Status do mês atual** — "Você está num pico" / "Baixa temporada" / "Mês neutro" comparando o mês atual com a média anual do ciclo sazonal.
3. **Volatilidade** — desvio padrão da série, classificado como "Estável" / "Volátil" / "Muito volátil". Importante pra decisão de estoque.
4. **Comparação histórica** — "Hoje X% vs pico histórico" e "X% vs 1 ano atrás" (ponto a ponto).
5. **Próximos 30 dias estimados** — usar slope + sazonalidade pra dizer "Tendência pros próximos 30 dias: subir ~12%".
6. **Melhor mês pra anunciar** — derivado do ciclo (mês com maior crescimento mês-a-mês, não só pico absoluto).
7. **Concorrência indireta** — contar quantas buscas relacionadas vieram (proxy de saturação): ">20 termos relacionados = mercado quente".

Tudo calculável **server-side sem novas chamadas** ao Trends.

## Plano de implementação

### 1. Fix do gráfico (bug visual nas janelas 30d/12m)

`TrendSearchCard.tsx` — função `chartWithForecast`:
- Quando timeframe ≠ "today 5-y": retornar `result.googleSeries.map(p => ({ period_date, real: p.interest_score }))` direto, **sem chave `forecast`** e **sem `<Area dataKey="forecast">`** renderizada
- `<YAxis>` muda de `domain={[0, 100]}` pra `domain={['auto', 'auto']}` ou `[0, 'dataMax + 10']` quando série máxima < 50, pra dar respiro visual
- `tickFormatter` adapta:
  - 7d → `"qua 15"` (dia da semana + dia)
  - 30d → `"15/jan"` (dia/mês curto)
  - 90d → `"jan 15"` (mês + dia)
  - 12m → `"jan/24"` (mês/ano)
  - 5y → `"24"` (só ano)
- Reduzir `minTickGap` de 40 → 25 pra mostrar mais ticks em janelas curtas
- Renderizar `<Area>` separada por timeframe (condicional) — se houver forecast, renderiza ambas; senão, só `real`

### 2. Backend: novos campos calculados

`supabase/functions/fetch-product-trends/index.ts` — adicionar ao response do `keywordOnly`:
- `marketScore` (0-100): `Math.round((avg * 0.5) + (clamp(momentum + 50, 0, 100) * 0.3) + (slopeNorm * 100 * 0.2))`
- `volatility`: desvio padrão / média; `volatilityLabel`: "estavel" | "volatil" | "muito_volatil"
- `currentMonthStatus`: compara `seasonal_cycle[mêsAtual].avg` com média do ciclo → `"pico" | "alta" | "neutro" | "baixa"` + delta %
- `vsLastYear`: pega ponto de ~365 dias atrás vs hoje na timeline 5y → `{ delta: %, value: number }` (só se 5y)
- `vsAllTimePeak`: `(latestValue / max) * 100`
- `next30dEstimate`: slope projetado + ajuste sazonal → número estimado + %
- `bestGrowthMonth`: mês com maior delta mês-a-mês no ciclo (não o pico absoluto)
- `marketSaturation`: count de relatedTop + relatedRising; label "morno" / "ativo" / "quente"

### 3. UI: redesign do bloco de insights

Substitui o grid 1×3 atual ("Tendência / Momento / Sazonalidade") por um layout 2-tier estilo Claude Designer:

**Tier hero (1 card largo)** — `Potencial de mercado: 78/100` com barra horizontal colorida + label semântica ("Mercado quente" / "Em equilíbrio" / "Em queda")

**Tier insights (grid 2×3 mobile / 3×2 desktop)** — 6 mini-cards densos:
| Ícone | Métrica | Valor |
|---|---|---|
| ⚡ | Tendência | Em alta forte |
| 📈 | Momento | +18% no mês |
| 🌊 | Volatilidade | Estável |
| 🗓️ | Mês atual | Pico (+32%) |
| 🎯 | Vs ano passado | +12% |
| 🔮 | Próximos 30d | ~Subir 8% |

**Tier ação (banner)** — texto interpretado em PT claro:
> "Demanda em **alta consistente**. Estamos em **pico sazonal** — bom momento pra anunciar. Pico anual em **outubro**, comece a estocar em **agosto**."

### 4. Copys reescritas (sem citar Google)

| Antes | Depois |
|---|---|
| "Pesquisar tendência de mercado" | "Análise de demanda" |
| "Descubra o interesse por qualquer produto" | "Descubra o potencial de qualquer produto antes de cadastrar" |
| "Janela:" | "Período:" |
| "Resultado para 'X'" | "Análise: **X**" |
| "pico 100 / média 45" | "Demanda máxima 100 · média 45" |
| "Interesse — últimos 12m" | "Demanda nos últimos 12 meses" |
| "Comparação de termos" | "Comparativo de produtos" |
| "Top cidades (BR)" | "Cidades com maior demanda" |
| "Interesse mundial" | "Demanda por país" |
| "Em alta agora" | "Termos bombando" |
| "Buscas populares" | "Termos mais buscados" |
| "projeção 3m" | "previsão dos próximos 3 meses" |

### 5. Polimento visual

- Card raiz: aumentar `border-l-2` → `border-l-4` pra ancorar visual
- Header: ícone num bg `gradient-to-br from-primary/20 to-primary/5` em vez de flat
- Skeleton loading: trocar boxes genéricos por skeleton que **espelha** o layout final (hero score + 6 mini-cards + chart)
- Empty state inicial: adicionar mockup pequeno do que vai aparecer pra dar contexto

## Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/fetch-product-trends/index.ts` | Novos campos calculados (marketScore, volatility, currentMonthStatus, vsLastYear, vsAllTimePeak, next30dEstimate, bestGrowthMonth, marketSaturation) no response keywordOnly |
| `src/hooks/useTrendSearch.ts` | Tipar e parsear novos campos |
| `src/components/products/TrendSearchCard.tsx` | Fix do gráfico em janelas 30d/12m, copys reescritas, novo layout de insights (hero score + grid 6 cards + banner ação), skeleton melhorado |

Sem migrações. Sem chamadas extras ao Trends.

## Trade-offs

- ✅ Resolve bug do gráfico vazio em 30d/12m (problema reportado)
- ✅ Copys 100% no idioma do app, sem expor fonte externa
- ✅ 7 novos insights derivados sem custo extra de API
- ✅ Hero "Potencial 0-100" dá resposta rápida ao "vale a pena vender isso?"
- ⚠️ Mais informação = mais altura — mitigado mantendo cards densos (h-16 cada) e aproveitando grids 2-col mobile
- ⚠️ `marketScore` é heurística composta — marcar como "estimativa" no tooltip pra não soar como verdade absoluta

