
## Objetivo

1. Na aba **Marketplaces** do detalhe do produto, permitir editar o card do Mercado Livre direto ali (sem abrir o ProductForm) e mostrar comparativo lado a lado **Clássico vs Premium**.
2. No card "Editar produto" (ProductForm), melhorar a visibilidade da margem real do Mercado Livre — destacar com a cor/identidade amarela do ML, deixando explícito que aquele preview é do Mercado Livre.

---

## 1. Edição inline do ML em `MarketplacesTab.tsx`

- Adicionar prop `onUpdateProduct(patch)` que persiste mudanças em `outrosCanais.ml` (recebida do `ProductDetail.tsx` → reaproveita o handler já usado pelo `onEditProduct`, fazendo um save parcial).
- No `ChannelDetail`, quando `channel.key === 'ml'`, renderizar um bloco extra **"Editar Mercado Livre"** (colapsável, fechado por padrão) contendo:
  - Inputs: Custo, Preço de venda, Categoria (select `ML_CATEGORIES`), Frete, Embalagem.
  - Toggle Clássico/Premium (apenas visual — o comparativo abaixo já mostra os dois).
  - Botão "Salvar" que dispara `onUpdateProduct({ outrosCanais: { ...current, ml: {...} } })` e mostra toast.
- Após o bloco de KPIs do ML, adicionar **comparativo Clássico vs Premium**:
  - Chamar `calcML(...)` 2x localmente (com `anuncio: 'classico'` e `'premium'`) usando os valores atuais do `outrosCanais.ml`.
  - Renderizar 2 mini-cards lado a lado (grid-cols-2) com: comissão %, lucro/un, margem %, badge de status.
  - Destacar o anúncio atualmente selecionado (`outrosCanais.ml.anuncio`) com borda mais forte e label "Atual".
  - Mostrar diferença (`Premium - Clássico`) em lucro e margem ao final, para deixar claro o trade-off.

## 2. Destaque amarelo do ML no `ProductForm.tsx`

- `renderChannelMiniPreview` hoje é genérico (verde/amarelo/vermelho por margem) e não identifica o canal.
- Alterar a assinatura para receber também `label` e `accentColor` por canal, OU criar variante específica quando `key === 'ml'`:
  - Header do preview: ícone + texto **"Mercado Livre"** em **amarelo ML** (`#FFE600` / `text-yellow-400`).
  - Borda esquerda amarela (`border-l-4 border-l-yellow-400`) e badge "ML" amarelo no canto.
  - Manter a cor da margem (success/warning/danger) só no número, mas o rótulo "Margem real — Mercado Livre" fica explícito.
- Aplicar o mesmo padrão de identificação textual nos outros 3 canais (TikTok, Shein, Amazon) com seus respectivos rótulos, para consistência — sem mudar cores deles (só ML ganha o amarelo agora, conforme pedido).

---

## Arquivos afetados

- `src/components/products/MarketplacesTab.tsx` — bloco editar ML + comparativo Clássico/Premium.
- `src/pages/ProductDetail.tsx` — passar `onUpdateProduct` para `MarketplacesTab` (reaproveita o save existente).
- `src/components/forms/ProductForm.tsx` — `renderChannelMiniPreview` com rótulo do canal e identidade amarela do ML.

## Fora de escopo

- Não mudar `outrosCanaisUtils.ts` nem `mlUtils.ts`.
- Não alterar lógica de cálculo, só apresentação e edição inline.
