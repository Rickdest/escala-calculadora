

## Plano: Redesign da Performance no estilo da referência + Tela de detalhes do produto

### O que muda

#### 1. Layout principal (`Performance.tsx`) — estilo tabela como na imagem

**KPI Cards**: manter os 4 cards atuais com bordas coloridas (já está bom).

**Ranking como tabela**: substituir o formato de lista Collapsible por uma tabela estruturada com colunas:
- **#** (posição/medalha)
- **Produto** (nome + ID)
- **Unidades** (qty + `▲ X% vendas`)
- **Receita** (valor + `▲ X% receita`)
- **Ticket Médio**
- **Un/Dia**
- **Ação** (botão "Ver detalhes")

No mobile: layout card com as métricas empilhadas (não tabela).

Ao clicar no produto, o painel inline expande com:
- 5 metric cards (Unidades, Receita, Ticket Médio, Un/Dia, **Top Variação** com nome e valor)
- Barras de % Vendas e % Receita (coloridas: laranja e verde)
- Grid de variações horizontal (cada variação como card com qty e receita)
- Insight com recomendação de estoque

O botão "Ver detalhes" navega para `/performance/:itemId` — tela dedicada.

#### 2. Tela de detalhes do produto (`PerformanceProductDetail.tsx`)

Nova página em `/performance/:itemId` que carrega os dados do produto a partir do `shopee_performance` salvo no banco e exibe:

- **Header**: nome do produto, ID, botões "Visualização ao vivo" (link externo Shopee) e "Editar Produto"
- **Métricas Principais**: cards grandes com Impressões, Cliques, Visitantes, Views de Página, CTR (dados que a API da Shopee fornece via `get_item_base_info` — `likes`, `views`, `sales`)
- **Variações detalhadas**: tabela com todas as variações, qty, receita, % do total
- **Participação no total**: barras visuais
- **Insight automático**: recomendação baseada na variação dominante

**Nota sobre dados da API**: A Shopee Order API fornece `item_list` com qty/preço por variação. Os endpoints de `product` fornecem `likes`, `sales`, `views` no `get_item_base_info`. Vamos enriquecer o `shopee-sync` para salvar essas métricas adicionais no `product_sales` JSONB.

#### 3. Enriquecer dados salvos no `shopee-sync`

Atualizar `fetchProductsWithModels` para salvar no `product_sales` de cada item:
- `image_url` (da `image.image_url_list[0]`)
- `likes`, `views`, `sales` (do `get_item_base_info`)
- `item_status`

Esses dados extras ficam disponíveis na tela de detalhes.

#### 4. Rota nova

Adicionar em `App.tsx`:
```
/performance/:itemId → PerformanceProductDetail
```

### Arquivos

```text
src/pages/Performance.tsx                              — tabela + expand inline redesenhado
src/components/performance/ProductExpandedDetail.tsx    — 5 cards + variações grid + insight
src/pages/PerformanceProductDetail.tsx                  — nova página de detalhes
src/App.tsx                                            — adicionar rota
supabase/functions/shopee-sync/index.ts                — enriquecer product_sales com image/likes/views
```

### Resultado

Performance com visual de tabela profissional no desktop, expansão inline rica, e tela de detalhes dedicada com tudo que a API disponibiliza — imagem do produto, métricas de engajamento, variações e insights.

