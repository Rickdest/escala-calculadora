

## Plano: Refatorar card "Economia por Venda" e renomear tabs

### 1. Renomear tabs (trivial)

**Arquivo: `src/components/roas/AdsDetailFullView.tsx`** — Linhas 1067 e 1074:
- "Diagnóstico" → "IA & Ação"
- "Métricas" → "Performance Ads"

### 2. Refatorar card "Economia por Venda" (linhas 1302-1339)

Criar dois estados baseados em `product?.costPrice > 0`:

**Estado 1 — Com custos cadastrados:**
- Header: título "Economia por venda", badge verde "Produto vinculado", botão "Editar custos" que alterna para Estado 2 inline
- Body: linhas com Custo do produto, Comissão Shopee (calculada: `salePrice * (feePercent/100) + feeFixed`), Gasto com ads (ACOS) em laranja
- Divider + bloco verde com "Lucro por venda" e valor `+ R$ X`

**Estado 2 — Sem custos (ou editando):**
- Badge cinza "Custos não configurados"
- Inputs compactos: Preço de venda, Custo do produto, Comissão Shopee (%), Frete subsidiado (R$)
- Pré-preenchidos com dados do produto quando existem
- Bloco verde com cálculo em tempo real
- Botão laranja "Salvar custos no produto" → chama `updateProduct(product.id, { costPrice, packagingCost })` via StoreContext
- Hint: "Esses dados serão salvos no cadastro do produto"

**Nota sobre DB:** Não é necessário criar colunas novas. O `costPrice` e `packagingCost` já existem na tabela `products`. A comissão Shopee é calculada pela config da loja (não é um campo separado). O "Frete subsidiado" será salvo como `packagingCost`.

### Estado interno necessário

Adicionar ao componente:
```typescript
const [editingCosts, setEditingCosts] = useState(false);
const [costForm, setCostForm] = useState({ salePrice: 0, costPrice: 0, commissionPct: 14, shippingCost: 0 });
```

Reset `editingCosts` no useEffect de `ad.id`.

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx` — renomear tabs + refatorar seção "Economia por Venda" (linhas 1060-1075 e 1302-1339)

