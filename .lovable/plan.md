

## Plano: Tornar Preço de Venda editável no card Economia por Venda

### Problema
O preço de venda mostra 51.53 (fallback GMV) mesmo com produto cadastrado a 49.90. O usuário quer poder editar tanto o preço de venda quanto o custo, e ao salvar, atualizar o produto na aba Produtos.

### Mudanças

**Arquivo: `src/components/roas/AdsDetailFullView.tsx`**

1. **Adicionar estado `costFormSalePrice`** junto ao `costFormCost` existente, inicializado com `product.salePrice` ou fallback GMV

2. **Ambos os estados do card mostram inputs editáveis** para Preço de Venda e Custo do Produto:
   - Inputs com fundo `#111`, border visível, sempre editáveis
   - Preço de venda pré-preenchido com `product.salePrice` (ou fallback GMV se não houver)
   - Custo pré-preenchido com `product.costPrice`

3. **Recalcular em tempo real** usando `costFormSalePrice` em vez de `salePrice` fixo:
   ```
   roasCalc = calcFullRoas(costFormSalePrice, costFormCost, config, ...)
   lucro = costFormSalePrice - costFormCost - taxaShopee - acosPerUnit
   ```

4. **Ao salvar, persistir ambos** — `updateProduct(product.id, { salePrice: costFormSalePrice, costPrice: costFormCost })`

5. **Reset dos estados** no useEffect de `ad.id` para re-inicializar com dados do novo produto

6. **Unificar os dois estados visuais** — sempre mostrar os inputs editáveis. A diferença será apenas:
   - Se `costPrice > 0`: badge "Configurado" verde + botão "Salvar alterações" (só aparece se houve mudança)
   - Se `costPrice === 0`: badge "Custo não informado" cinza + botão "Salvar custo no produto"

