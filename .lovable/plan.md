# Melhorias na Análise de Lucro — Parent SKU Detail

## Objetivo
Reescrever o fluxo do arquivo `parentskudetail` para (1) considerar só linhas do produto principal, (2) vincular automaticamente aos produtos cadastrados no app, (3) permitir vinculação manual / custo manual por linha, e (4) salvar as vinculações para reuso em importações futuras.

Nada existente é removido — o parser atual do Shop Stats e a tela de análise continuam funcionando; apenas o modo "Parent SKU" ganha esse novo comportamento.

## 1. Parser do parentskudetail
Atualizar `src/lib/parsers/parseShopeeProductOverview.ts` (ou criar `parseShopeeParentSkuDetail.ts`) para ler a aba **"Produtos com Melhor Desempenho"**:

- Filtrar apenas linhas em que `ID da Variação = "-"` (linha consolidada do produto principal).
- Extrair por linha:
  - `itemId` → `ID do Item`
  - `productName` → `Produto`
  - `parentSku` → `SKU Principle`
  - `variationSku` → `SKU da Variação` (normalmente "-" no principal, guardado para o fallback de match)
  - `revenue` → `Vendas (Pedido pago) (BRL)` (parser BR: `1.234,56`)
  - `units` → `Unidades (Pedido pago)`
- Ignorar linhas com `revenue = 0` e `units = 0`.

## 2. Vinculação automática com produtos cadastrados
Nova função `matchShopeeProduct(row, products)` em `src/lib/profit/matchProduct.ts`:

Ordem de tentativa (retorna no primeiro match):
1. Vinculação salva em `shopee_product_links` (ver seção 4).
2. `itemId` = valor do campo `shopeeItemId` do produto.
3. `parentSku` = SKU cadastrado (case-insensitive, trim).
4. `variationSku` bate com o SKU do produto ou de uma variação.
5. Nome do produto (normalização: minúsculas, sem acentos, similaridade ≥ 0.85 via Dice/Jaccard sobre tokens).

Resultado: `{ productId, matchType: 'saved' | 'itemId' | 'sku' | 'variationSku' | 'name' | null }`.

## 3. Nova tela "Lucro por Produto (Parent SKU)"
Componente novo `src/components/profit/ParentSkuProfitTable.tsx` renderizado no `ProfitAnalysis.tsx` quando o arquivo detectado é Parent SKU Detail.

Colunas por linha:
- Produto Shopee (nome + ID do Item + SKU Principle)
- Unidades pagas
- Vendas pagas (R$)
- **Vínculo**: badge de status + `Select` com produtos do cadastro + opção "Custo manual" + opção "Sem vínculo"
- Custo unitário (input; readonly quando vier do cadastro, editável em modo manual)
- Custo total = unidades × custo unitário
- Lucro bruto = vendas − custo total
- Margem % = lucro / vendas × 100

Estados de linha (badges):
- `Vinculado automaticamente` (verde) — match via itemId/SKU/variação/nome
- `Vinculado manualmente` (azul) — usuário escolheu ou vínculo salvo anteriormente
- `Custo manual` (roxo) — usuário optou por digitar
- `Sem custo` (vermelho/amarelo) — sem vínculo e sem custo manual; bloqueia "finalizar cálculo"

Ações por linha:
- Trocar produto vinculado (Select com busca no catálogo da loja atual)
- Alternar para "Custo manual" e digitar custo
- Limpar vínculo

## 4. Persistência das vinculações
Nova tabela `shopee_product_links`:

```text
id uuid pk
user_id uuid
store_id uuid
shopee_item_id text        -- chave principal para match
parent_sku text nullable
variation_sku text nullable
product_id uuid references products
manual_unit_cost numeric nullable   -- quando o usuário optou por custo manual sem produto
link_type text  -- 'product' | 'manual_cost'
created_at, updated_at
unique(user_id, store_id, shopee_item_id)
```

Fluxo:
- Ao vincular manualmente / trocar vínculo / definir custo manual → `upsert` em `shopee_product_links`.
- Ao importar de novo, a etapa 1 do matcher busca por (`store_id`, `shopee_item_id`) e reaplica o vínculo (com custo atual do cadastro, não o antigo).
- RLS: `auth.uid() = user_id`. GRANT para `authenticated` + `service_role`.

## 5. Resumo geral (topo da análise, modo Parent SKU)
Card único com:
- Vendas pagas totais (Σ vendas)
- Unidades pagas totais (Σ unidades)
- Custo total dos produtos (Σ custo total das linhas, ignora linhas sem custo)
- **Inputs manuais**: Taxas Shopee, Anúncios, Outros custos (persistidos em `profit_analyses.extra_costs` — coluna JSON nova)
- Lucro final = vendas totais − custo produtos − taxas − anúncios − outros
- Margem final = lucro final / vendas totais × 100
- Aviso quando houver linhas "Sem custo": "N produtos sem custo — o lucro pode estar superestimado."

## 6. Integração no ProfitAnalysis.tsx
- Detectar modo Parent SKU pelo parser e renderizar `ParentSkuProfitTable` no lugar da tabela genérica.
- Manter cards de resumo, filtros de período/agrupamento e gráfico de linha (agora alimentados por `vendas × lucro por produto` agregado).
- Salvar análise: gravar `raw_rows` (linhas do parser) + `product_links_snapshot` + `extra_costs` em `profit_analyses`.

## Arquivos afetados
- **Novo:** `src/lib/parsers/parseShopeeParentSkuDetail.ts`
- **Novo:** `src/lib/profit/matchProduct.ts`
- **Novo:** `src/components/profit/ParentSkuProfitTable.tsx`
- **Novo:** `src/components/profit/ProductLinkSelect.tsx`
- **Novo:** `src/hooks/useShopeeProductLinks.ts`
- **Edit:** `src/pages/ProfitAnalysis.tsx` (roteia modo Parent SKU, adiciona campos de custos manuais)
- **Edit:** `src/lib/profitAnalysis.ts` (helpers de totais/margem por linha)
- **Migração:** cria `shopee_product_links` + coluna `extra_costs jsonb` em `profit_analyses`

## Fora de escopo
- Alterar o parser do Shop Stats (modo timeline continua igual).
- Vincular por foto/EAN.
- Editar cadastro de produtos a partir desta tela.
