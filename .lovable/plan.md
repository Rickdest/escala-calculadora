

## Redesign da Aba Análise de Ads — Estilo Shopee Seller Center

### Visão Geral

Redesenhar o layout da aba "Análise de Ads" para se parecer com o painel de Ads do Shopee Seller Center: toolbar no topo com ações, tabela/lista organizada com métricas em colunas, e opção de excluir dados. Layout mais profissional e denso no desktop, mantendo cards no mobile.

### Mudanças

#### 1. `src/components/roas/AdsTab.tsx` — Layout principal redesenhado

**Toolbar no topo** (estilo Shopee):
- Row horizontal com: contagem de anúncios ("X anúncios"), botão "Importar CSV", botão "Excluir Tudo" (destructive, com confirmação via AlertDialog)
- FilterChips movidos para abaixo da toolbar
- No desktop, SummaryCards e toolbar ficam lado a lado ou empilhados de forma compacta

**Botão Excluir Tudo**:
- Ícone `Trash2`, variante `ghost` destructive
- Ao clicar, abre AlertDialog: "Tem certeza? Isso removerá todos os dados de Ads importados."
- Chama `deleteAll()` do `useAdsData`

**Desktop layout** (≥1024px):
- Grid `lg:grid-cols-12`: conteúdo principal em `lg:col-span-9`, alertas em `lg:col-span-3`
- Cards em grid `md:grid-cols-2 xl:grid-cols-3` no desktop
- SummaryCards em row horizontal compacta

**Mobile**: mantém stack vertical atual

#### 2. `src/components/roas/AdsProductCard.tsx` — Adicionar botão excluir individual

- Adicionar prop `onDelete: () => void`
- No canto superior direito do card (ao lado do score ou progress badge), adicionar um botão `Trash2` discreto (`text-text-3 hover:text-destructive`)
- Click com `e.stopPropagation()` para não abrir o detalhe
- Sem confirmação no card individual (ação rápida)

#### 3. `src/components/roas/AdsTab.tsx` — Passar deleteAdsData e deleteAll

- Desestruturar `deleteAdsData` e `deleteAll` do `useAdsData()`
- Passar `onDelete={() => deleteAdsData(ad.id)}` para cada `AdsProductCard`
- Botão "Excluir Tudo" na toolbar usa `deleteAll()`
- Usar `AlertDialog` do shadcn para confirmação do "Excluir Tudo"

#### 4. `src/components/roas/SummaryCards.tsx` — Layout mais compacto no desktop

- No desktop: cards menores, grid `grid-cols-4` com padding reduzido
- Barra de status (lucrativos/atenção/prejuízo) mais inline e compacta

#### 5. `src/components/roas/AdsEmptyState.tsx` — Melhorar empty state

- Adicionar instrução visual mais clara estilo Shopee: passo a passo com numeração (1. Acesse Shopee Seller → 2. Marketing → 3. Exportar CSV)

### Arquivos alterados
- `src/components/roas/AdsTab.tsx`
- `src/components/roas/AdsProductCard.tsx`
- `src/components/roas/SummaryCards.tsx`
- `src/components/roas/AdsEmptyState.tsx`

### Não altera
- `useAdsData.ts` (já tem `deleteAdsData` e `deleteAll`)
- `adsLogic.ts`, `shopeeAdsParser.ts`
- `AdsDetailView.tsx`
- Nenhuma funcionalidade removida

