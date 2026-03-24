

## Redesign do ProductCard na Aba Produtos

### O que muda

Baseado na referência enviada, o card do produto passa a mostrar:
- Imagem + Nome + Preço/Custo (linha 1)
- Margem + Lucro em badges coloridos (linha 2)
- **Se tem dados de Ads**: badges compactos com Posição, ROAS, ACOS, unidades vendidas
- **Se não tem Ads**: botão "Importar Ads CSV" compacto
- Botão "Comparar Canais" se o produto tem `outrosCanais` configurado
- **Remover** badges de estoque (Sem estoque / Estoque baixo) do card

### Layout do Card (Mobile ~390px)

```text
┌─────────────────────────────────────────┐
│ 🖼️48px  Nome do Produto Truncado...    │
│         Preço: R$ 49,90 · Custo: R$ 18 │
│                                         │
│  [Margem: 22,4%]  [Lucro: R$ 11,20]    │
│                                         │
│  Se tem ads:                            │
│  🔥#14  ROAS 10,49  ACOS 9,53  119 un  │
│                                         │
│  Se não tem ads:                        │
│  [📊 Importar Ads CSV]                  │
│                                         │
│  Se tem outrosCanais:                   │
│  [🔄 Comparar Canais]                   │
└─────────────────────────────────────────┘
```

### Implementação

**Arquivo: `src/components/cards/ProductCard.tsx`**

1. Remover toda lógica de `stockAlert` e badges de estoque
2. Reestruturar layout: imagem + info em coluna (não mais row inline com lucro/margem separados)
3. Adicionar linha de Margem + Lucro como badges coloridos (verde/vermelho)
4. Adicionar linha de métricas Ads quando `adsMetric` existe:
   - Posição com cor semântica (verde ≤3, azul ≤8, âmbar ≤16, vermelho >16)
   - ROAS, ACOS, unidades vendidas — como chips compactos
5. Quando não tem `adsMetric`, mostrar botão "Importar Ads CSV" que abre `ImportAdsModal`
6. Adicionar botão "Comparar Canais" quando `product.outrosCanais` tem dados — abre o form de edição na seção de canais
7. Manter menu dropdown (⋮) com Editar, Duplicar, Excluir
8. Manter `onClick` → `onEdit(product)`

**Arquivo: `src/pages/Products.tsx`**
- Sem mudanças necessárias, já passa `adsMetric={metricsMap[product.id]}` para o ProductCard

### Cores de posição
- `#1-3`: text-success (verde)
- `#4-8`: text-primary (azul)
- `#9-16`: text-warning (âmbar)
- `#17+`: text-destructive (vermelho)

### Arquivos alterados
- `src/components/cards/ProductCard.tsx` — redesign completo do layout

