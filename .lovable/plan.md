

## Plano: Filtro de datas na aba Ads

### Situação atual
A aba Ads mostra todos os dados sem filtro de datas. Os dados da API (`shopee_ads_by_product`) já possuem `period_start` e `period_end` por registro, e os dados CSV têm `periodo_inicio` e `periodo_fim`. Existe um filtro de período para CSV (`selectedPeriod`) mas não funciona para dados da API.

### O que fazer

Adicionar um filtro de datas unificado no topo da aba Ads com dois inputs de data (início e fim) que filtra tanto dados da API quanto do CSV.

#### 1. Componente de filtro de datas
- Dois inputs `type="date"` (De / Até) no header da aba, ao lado dos botões existentes
- Valores padrão: últimos 28 dias (compatível com a janela da API Shopee)
- Botão "Limpar" para mostrar todos os dados

#### 2. Filtragem dos dados da API
- No `buildApiAdsDataFromRows` ou no `useMemo` de `apiEnriched`, filtrar `persistedRows` por `period_start` e `period_end` antes de agregar
- Se a data do registro (`period_start` a `period_end`) intersecta o range selecionado, incluir

#### 3. Filtragem dos dados CSV
- Substituir o filtro `selectedPeriod` (dropdown) pela mesma lógica de range de datas
- Filtrar `data` (CSV) por `periodo_inicio` / `periodo_fim`

#### 4. Recalcular resumo
- O `SummaryCards` e `ApiAdsDashboard` já recebem dados filtrados, então recalculam automaticamente

### Arquivos modificados
```
src/components/roas/AdsTab.tsx — estado de dateFrom/dateTo, inputs de data, filtro nos useMemos
src/hooks/useApiAdsData.ts    — aceitar filtro de datas no buildApiAdsDataFromRows (opcional, pode filtrar no componente)
```

### Resultado
O usuário escolhe um range de datas e vê apenas os dados daquele período — tanto da API quanto do CSV — com os cards de resumo recalculados automaticamente.

