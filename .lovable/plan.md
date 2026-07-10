# Área Lucro — separar por marketplace (Shopee e Mercado Livre)

## Objetivo
Transformar a página `/lucro` em duas abas independentes — **Shopee** e **Mercado Livre** — com dados, cadastros e configurações totalmente separados. A aba Shopee continua exatamente como está hoje. A nova aba Mercado Livre replica o mesmo padrão visual e de fluxo, mas com regras, taxas e importador próprios do ML.

## Estrutura da página

```text
/lucro
├── Aba "Shopee"           (código atual intacto)
└── Aba "Mercado Livre"    (novo)
     ├── Resumo (cards)
     ├── Importar relatório (XLSX)
     ├── Produtos (tabela + edição rápida)
     ├── Configuração de taxas
     └── Histórico de importações
```

`ProfitAnalysis.tsx` passa a renderizar apenas um `<Tabs>` no topo; todo o conteúdo Shopee atual é movido para `<ShopeeProfitTab />` sem mudar sua lógica. A nova aba ML renderiza `<MercadoLivreProfitTab />`.

## 1. Importador do relatório ML
Novo parser `src/lib/parsers/parseMercadoLivreReport.ts`:
- Lê a aba **"Relatório"** do XLSX (usando `xlsx`).
- Detecta a linha de cabeçalho procurando "ID do anúncio" + "Anúncio" + "SKU".
- Normaliza colunas (ignora moeda entre parênteses): `Vendas brutas`, `Vendas brutas (BRL)`, `Vendas brutas (R$)`, etc. viram `vendasBrutas`.
- Ignora linhas de título, vazias e totais.
- Extrai por linha: `adId`, `title`, `status`, `variation`, `sku`, `uniqueVisits`, `salesCount`, `uniqueBuyers`, `unitsSold`, `grossSales`, `participationPct`, `conversionVisits`, `conversionBuyers`.
- Chave de deduplicação: `sku` (prioritário) → `adId` (fallback).
- Retorna `{ periodStart, periodEnd, rows[], fileHash }`.

## 2. Cadastro de produtos ML (persistência)
Novas tabelas:

```text
ml_products
  id, user_id, store_id
  ad_id (text), sku (text)
  name, variation, status
  ad_type ('classico' | 'premium' | null)
  sale_price, cost_price, packaging_cost, additional_cost
  freight_cost, freight_mode ('per_unit'|'per_sale'|'total_manual'|'none')
  tax_value, tax_mode ('percent'|'fixed'|'default')
  notes, linked_manually bool
  created_at, updated_at
  unique(user_id, store_id, coalesce(sku,''), coalesce(ad_id,''))

ml_fee_config
  id, user_id, store_id
  classic_pct, premium_pct
  fixed_fee_min_price
  fixed_fee_tiers jsonb   -- [{min,max,fee}]
  other_fees jsonb
  effective_date, updated_at

ml_import_history
  id, user_id, store_id
  file_name, file_hash
  period_start, period_end
  ads_count, linked_count, unlinked_count
  raw_rows jsonb
  created_at
```

Todas com GRANT para `authenticated` e `service_role`, RLS via `auth.uid() = user_id`, trigger `updated_at`.

Regras:
- Ao importar, faz **upsert por `(sku|ad_id)`** — mantém custos, tipo de anúncio, imposto e frete já salvos.
- Vinculação: automática por SKU → por ad_id → manual.
- Botão "Desvincular produto" apaga apenas o vínculo (custos ficam), histórico permanece.
- Deduplicação de importação: (`file_hash` OU (`period_start`,`period_end`,`ads_count`,`grossSalesTotal`)) já existente → alerta "Relatório já importado".

## 3. Taxas configuráveis (`Configuração de taxas do Mercado Livre`)
Tela dentro da aba com:
- Percentual Clássico / Premium.
- Tarifa fixa mínima aplicável (valor mínimo do preço).
- Faixas de tarifa fixa (`[{min, max, fee}]`, editáveis, adicionar/remover linhas).
- Outras tarifas (livre).
- Data de vigência.

Defaults iniciais (baseados em `ML_CATEGORIES` já existente em `src/lib/mlUtils.ts`) apenas como sugestão — usuário edita e salva em `ml_fee_config`. Nada hardcoded no cálculo.

## 4. Cálculo do lucro (novo `src/lib/profit/mercadoLivreCalc.ts`)
Para cada produto:

```text
receita          = grossSales
custoProdutos    = costPrice        * unitsSold
custoEmbalagem   = packagingCost    * unitsSold
custosAdicionais = additionalCost   * unitsSold
comissao         = receita * (adType==='premium' ? premium_pct : classic_pct)
tarifaFixaUnit   = faixa(fixed_fee_tiers, salePriceMedio)   // 1× por unidade do anúncio
tarifaFixaTotal  = tarifaFixaUnit * unitsSold               // kits = 1× por unidade do anúncio, não por item interno
imposto          = tax_mode==='percent' ? receita * tax/100
                 : tax_mode==='fixed'   ? tax * unitsSold
                 : default (config global)
frete            = per_unit → freightCost * unitsSold
                 | per_sale → freightCost * salesCount
                 | total_manual → freightCost
                 | none → 0
lucro            = receita - custoProdutos - custoEmbalagem - custosAdicionais - comissao - tarifaFixaTotal - imposto - frete
margem           = receita>0 ? lucro/receita*100 : 0
lucroPorUnidade  = unitsSold>0 ? lucro/unitsSold : 0
precoMedio       = unitsSold>0 ? receita/unitsSold : 0
```

Guards contra divisão por zero e valores negativos.

## 5. UI da aba Mercado Livre
Componentes novos em `src/components/profit/ml/`:
- `MercadoLivreProfitTab.tsx` — orquestra sub-abas Resumo / Importar / Produtos / Taxas / Histórico.
- `MLImportCard.tsx` — upload XLSX, mostra período detectado, resultado e histórico.
- `MLProductTable.tsx` — tabela com todas as colunas descritas (Produto, SKU, ID, Status, Variação, Tipo, Vendas, Unidades, Vendas brutas, Preço médio, Custo unit., Custo total, Embalagem, Frete, Taxa %, Comissão, Tarifa fixa, Imposto, Outros, Lucro, Lucro/un., Margem, Situação). Edição inline dos campos indicados; campos importados são somente leitura.
- `MLProductEditDrawer.tsx` — edição completa do cadastro (nome, SKU, ad_id, variação, status, tipo, preços, custos, frete, imposto, observações, vincular/desvincular, data de atualização). Botão "Salvar configurações do produto".
- `MLFeeConfigCard.tsx` — CRUD de `ml_fee_config` incluindo faixas de tarifa fixa.
- `MLSummaryCards.tsx` — cards do resumo com todos os totais listados no item 13.
- `MLFilters.tsx` — período, produto, SKU, ID, status, tipo, lucro/prejuízo, configurado/não configurado, busca por nome.
- `MLHistoryList.tsx` — lista de `ml_import_history` com "Re-visualizar".

Indicadores visuais:
- Lucro verde, prejuízo vermelho, cadastro incompleto amarelo, inativo cinza — sempre acompanhados de badge/ícone (não só cor).
- "Situação do cadastro": Configurado / Custo não informado / Tipo não informado / Frete não configurado / Imposto não configurado / Produto não vinculado.

## 6. Hooks e services
Novos em `src/hooks/`:
- `useMLProducts(storeId)` — CRUD upsert/list.
- `useMLFeeConfig(storeId)` — get/save.
- `useMLImportHistory(storeId)` — list/insert/get.

Todos filtrados por `store_id` (memória Core de isolamento).

## 7. Preservação da Shopee
- Nada removido de `ProfitAnalysis.tsx`, `ParentSkuProfitTable`, `useProfitAnalysis`, `useShopeeProductLinks`, parsers Shopee, `profitAnalysis.ts`, export report, extra_costs.
- Todo o conteúdo atual da página vira `<ShopeeProfitTab />` (mesmo arquivo movido, mesma lógica).
- Regra de kits Shopee (taxa fixa 1× por unidade do anúncio) mantida.

## 8. Validações
Aviso por linha quando faltar: custo, tipo de anúncio, taxa configurada, imposto obrigatório, vínculo, unidades inválidas, receita negativa. Linha aparece na tabela com badge amarelo/vermelho — nunca assume campo vazio como zero silenciosamente.

## Migração (executada em uma chamada)
`create` de `ml_products`, `ml_fee_config`, `ml_import_history` + GRANTs + RLS + policies + triggers `updated_at`.

## Arquivos afetados

**Novos:**
- `supabase/migrations/<ts>_ml_profit.sql`
- `src/lib/parsers/parseMercadoLivreReport.ts`
- `src/lib/profit/mercadoLivreCalc.ts`
- `src/hooks/useMLProducts.ts`, `useMLFeeConfig.ts`, `useMLImportHistory.ts`
- `src/components/profit/ml/MercadoLivreProfitTab.tsx`
- `src/components/profit/ml/MLImportCard.tsx`
- `src/components/profit/ml/MLProductTable.tsx`
- `src/components/profit/ml/MLProductEditDrawer.tsx`
- `src/components/profit/ml/MLFeeConfigCard.tsx`
- `src/components/profit/ml/MLSummaryCards.tsx`
- `src/components/profit/ml/MLFilters.tsx`
- `src/components/profit/ml/MLHistoryList.tsx`
- `src/components/profit/shopee/ShopeeProfitTab.tsx` (extrai conteúdo atual)

**Editados:**
- `src/pages/ProfitAnalysis.tsx` — reduz para `<Tabs>` Shopee/ML.
- `.lovable/plan.md` — atualizado.
- `src/integrations/supabase/types.ts` — auto após migração.

## Fora de escopo
- Integração via API do Mercado Livre (só importação de XLSX).
- Compartilhar custo-base do produto entre Shopee e ML numa mesma entidade (cada marketplace mantém seu próprio cadastro nesta versão).
- Alterações no cálculo, parser ou UI da Shopee.
