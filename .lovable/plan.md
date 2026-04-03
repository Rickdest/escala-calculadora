

## Plano: Unificar layout — usar design do CSV para tudo, com tag "CSV" quando exclusivo

### Problema

O dashboard tem dois layouts diferentes: os cards CSV (`AdsProductCard`) são mais bonitos (barra de cor no topo, imagem do produto, métricas primárias/secundárias bem separadas, badges de classificação) enquanto os cards API (`CampaignCard` dentro de `ApiAdsDashboard`) são mais simples (sem imagem, sem barra de cor, layout diferente). O usuário quer um layout único usando o design CSV.

### Abordagem

Eliminar a seção CSV separada e o `CampaignCard` interno do `ApiAdsDashboard`. Usar o `AdsProductCard` como componente único para ambas as fontes, adicionando uma badge "CSV" ou "API" para distinguir a origem quando necessário.

### Alterações

#### 1. `AdsTab.tsx` — renderização unificada
- Quando `effectiveApiData` existe, converter os dados da API (`ads_by_campaign`) para o formato `EnrichedAdsData` que o `AdsProductCard` espera
- Mesclar dados API + CSV numa lista única
- Dados exclusivos do CSV recebem badge "CSV"
- Renderizar tudo com `AdsProductCard` + `SummaryCards` + `FilterChips` (layout CSV)
- Remover a renderização separada do `ApiAdsDashboard` como seção de cards (manter apenas KPIs e gráficos dele)

#### 2. `ApiAdsDashboard.tsx` — extrair apenas a parte de resumo
- Remover a lista de `CampaignCard` (linhas 458-521)
- Manter: KPIs, secondary KPIs, chart diário, heatmap horário, saldo, produtos recomendados
- Exportar como `ApiAdsSummary` (ou renomear) para deixar claro que não tem mais lista de produtos

#### 3. `AdsProductCard.tsx` — suportar dados da API
- Adicionar prop opcional `source: 'csv' | 'api'`
- Quando `source === 'csv'`, mostrar badge "CSV" pequena
- O card já aceita `EnrichedAdsData`, então basta mapear os campos da API para esse tipo

#### 4. Mapeamento API → EnrichedAdsData (novo helper)
- Criar função `apiCampaignToEnrichedAds(campaign, products)` que converte `CampaignAds` → `EnrichedAdsData`
- Mapear: `expense→despesas`, `gmv→gmv`, `roas→roas`, `item_name→nome_produto_csv`, `status`, etc.
- Quando o produto está vinculado no cadastro, puxar imagem e classificação

### Arquivos alterados

```text
src/components/roas/AdsTab.tsx            — unificar renderização, mesclar API+CSV
src/components/roas/ApiAdsDashboard.tsx    — remover lista de cards, manter só resumo/gráficos
src/components/roas/AdsProductCard.tsx     — adicionar badge de origem (CSV/API)
src/lib/adsHelpers.ts ou novo helper      — função de mapeamento API→EnrichedAdsData
```

### Resultado

Uma única lista de produtos com o layout bonito do CSV, KPIs e gráficos da API no topo, e badges indicando a origem dos dados.

