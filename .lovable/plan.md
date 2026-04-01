

## Plano: Corrigir edição de taxas de marketplaces na página de produto

### Problema

Ao clicar para editar um produto (desktop `/products/:id` ou drawer mobile), **não há seção "Outros Canais"** — os campos de TikTok, Shein, Amazon e Mercado Livre simplesmente não existem nessas telas. Eles só aparecem no modal de criação/edição (`ProductForm`).

Além disso, o `handleSave` do ProductDetail salva apenas `name`, `costPrice`, `salePrice`, `packagingCost` — mesmo que houvesse campos de outros canais, os dados não seriam persistidos.

### Solução

Em vez de duplicar toda a lógica de "Outros Canais" no ProductDetail e no Drawer, a abordagem é:

**Na página ProductDetail (desktop)**: Ao clicar "Editar produto", abrir o `ProductForm` (modal completo que já tem todos os campos, incluindo Outros Canais, Ads, etc.) em vez de usar o formulário inline simplificado.

**No ProductDetailDrawer (mobile)**: O botão "Editar" já chama `onEdit(product)` que abre o `ProductForm`. O problema é que a aba "edit" inline do drawer também não tem esses campos. Vamos remover a aba "edit" redundante do drawer e manter apenas o botão que abre o ProductForm completo.

### Alterações

**1. `src/pages/ProductDetail.tsx`**
- Adicionar estado `showProductForm` e importar `ProductForm`
- Substituir o formulário inline (campos nome/custo/venda/embalagem + botão salvar) por um botão "Editar Produto" que abre o `ProductForm` modal
- Manter toda a área de visualização (métricas, breakdown, ROAS, canais, projeção) como está
- Quando o `ProductForm` salva, atualizar o produto e fechar o modal

**2. `src/components/ProductDetailDrawer.tsx`**
- Remover a aba "edit" inline (que só tem 4 campos)
- Manter botão "Editar" no header que chama `onEdit(product)` → abre ProductForm
- A aba fica só "info" (visualização)

### Resultado
- O usuário consegue editar TODOS os campos (incluindo TikTok, Shein, Amazon, ML) de qualquer ponto do app
- Código DRY: um único formulário de edição (`ProductForm`) em vez de 3 versões diferentes
- Dados de `outrosCanais` são corretamente persistidos via o `handleSubmit` do ProductForm que já inclui `outrosCanais` no save

