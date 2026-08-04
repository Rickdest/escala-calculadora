# Versões de venda visíveis na análise do produto

Hoje o produto "Chaveiro Vertical Aço" tem uma versão extra (ex.: 2 UN / Par) salva em "Kits / Versões de venda", mas a tela de detalhe só analisa a versão principal. A margem da variação aparece só em uma faixinha pequena dentro do modal de edição, e o card do produto na listagem nem menciona que existem versões.

## O que muda

### 1. Seletor de versão no topo da aba "Análise Shopee"
- Logo abaixo da tag "ANÁLISE · SHOPEE", uma linha de chips: `Principal (un)` + um chip para cada versão salva (ex.: `2 UN`), cada chip mostrando a margem em cor (verde/amarelo/vermelho).
- Ao trocar de chip, **toda a análise recalcula para aquela versão**: Lucro/un, Margem real, vs Meta, ROAS empate, Custo/un, Breakdown de custos (taxa Shopee correta para a faixa de preço daquela versão), ROAS de referência e Projeção mensal.
- O header do produto passa a mostrar preço/custo da versão selecionada, com um rótulo discreto do nome da versão.

### 2. Card "Versões de venda" com comparativo real
Substitui o bloco atual (que fica no fim da página) por um comparativo lado a lado, no mesmo padrão do "Comparativo de Canais":
- Uma linha por versão (incluindo a principal), com Venda, Custo, Lucro/un, Margem com barra proporcional e ROAS de empate.
- Destaque de "melhor versão" (maior margem) e diferença de lucro em relação à principal.
- Clicar numa linha seleciona aquela versão nos KPIs acima.

### 3. Card do produto na listagem
- Badge com o número de versões quando houver (ex.: `2 versões`).
- Mini-linha comparando a margem da melhor versão vs a principal, para não ficar escondido.

### 4. Formulário: margem menos escondida
Dentro de "Kits / Versões de venda", cada versão passa a exibir uma faixa de resultado maior e legível com Margem, Lucro/un e ROAS de empate (mesmas cores de status do app), em vez do rótulo minúsculo atual.

## Detalhes técnicos

- Nenhuma mudança de banco: continua usando `price_variants` (`Product.priceVariants`).
- Em `src/pages/ProductDetail.tsx`: novo estado `selectedVariantId`; deriva um `activeProduct` (`{...product, costPrice, salePrice}` da versão) e usa esse objeto em `calculateProduct`, `calcFullRoas`, breakdown, projeção e badge de status. Estoque e Marketplaces continuam baseados no produto real.
- Cálculo por versão usa `calculateProduct` + `calcFullRoas` existentes, com `packagingCost` do produto aplicado igualmente (hoje o bloco de versões zera embalagem; será alinhado ao mesmo critério da análise principal).
- `src/components/cards/ProductCard.tsx`: badge + linha de melhor versão usando `calculateProduct`.
- `src/components/forms/ProductForm.tsx`: apenas apresentação da faixa de resultado por versão.
