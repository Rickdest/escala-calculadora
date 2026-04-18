

## Diagnóstico

No `ProductForm.tsx`, o campo "Preço de Venda" está bloqueado quando o produto vem da Shopee (tem `shopee_product_id`). A intenção era proteger contra edição acidental do preço sincronizado, mas isso impede o usuário de corrigir quando a Shopee envia preço errado (ou quando o produto tem variação e a API retorna o preço de uma SKU específica).

## Verificação rápida no código

Preciso confirmar exatamente como está o lock atual. Vou inspecionar `src/components/forms/ProductForm.tsx` na seção de Precificação para identificar o atributo `disabled`/`readonly` e o badge "🔒 Shopee" / "Seller Center".

## Solução proposta

**Desbloquear o campo "Preço de Venda" sempre, independente da origem.** Manter apenas indicadores visuais de que o preço veio da Shopee, sem travar:

1. **Remover** `disabled`/`readOnly` do input de preço de venda
2. **Trocar o badge** "🔒 Shopee" por "Sincronizado da Shopee" (sem cadeado), mantendo o link "Seller Center" como referência
3. **Adicionar texto helper** abaixo do input quando o produto for da Shopee:  
   _"Valor sincronizado automaticamente. Edite se a Shopee enviou um preço incorreto (comum em produtos com variação)."_
4. **Visual**: input mantém fundo neutro (não mais cinza-bloqueado) e ganha um pequeno ícone informativo

### Comportamento ao salvar
- Se o usuário editar o preço de venda de um produto Shopee, salvar normalmente no banco (campo `sale_price`)
- Não tentar fazer push reverso pra Shopee (a integração é Read-Only — regra do projeto)
- Próxima sincronização da Shopee **sobrescreverá** o valor editado (comportamento atual do `useShopeeProducts`). Adicionar nota no helper alertando isso, OU bloquear o overwrite se `sale_price` foi modificado manualmente.

### Pergunta importante
A sincronização atual (`useShopeeProducts.importProducts`) **sempre sobrescreve** `sale_price` ao reimportar. Se o usuário editar manualmente, na próxima importação perde a edição.

## Decisão necessária

<questions to user>

</questions>

## Arquivo único modificado

- `src/components/forms/ProductForm.tsx` — remover lock do input de preço, trocar badge, adicionar helper text
- (Opcional, conforme resposta) `src/hooks/useShopeeProducts.ts` — não sobrescrever `sale_price` no update se já existe valor

## O que NÃO muda
- Lógica de cálculo, ROAS, comparativo de canais
- Layout geral do modal (já refatorado)
- Tokens de cor

