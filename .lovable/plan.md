

## Melhorar seletor de produto na aba ROAS — mostrar lista visível no mobile

### Problema
O `ProductPicker` atual mostra apenas um botão/card com "Selecione um produto..." e um botão "Trocar". No mobile, não fica claro que é preciso clicar ali. O usuário prefere ver uma lista/container de produtos diretamente.

### Mudanças em `src/components/charts/RoasAnalysis.tsx`

**Quando nenhum produto está selecionado (`!selectedProductId`):**
- Em vez do picker fechado, mostrar uma **lista scrollável de produtos** como cards clicáveis (estilo similar ao dropdown já existente mas sempre visível)
- Título "Selecione um produto" acima da lista
- Cada item: imagem + nome + preço + badge ROAS (reaproveitando o layout do dropdown)
- Max-height com scroll no mobile (~300px)

**Quando um produto já está selecionado:**
- Manter o picker compacto atual com botão "Trocar" (funciona bem nesse estado)

### Resultado
- Usuário vê todos os produtos ao entrar na aba, sem precisar adivinhar que deve clicar
- Após selecionar, o layout compacto com "Trocar" continua funcionando normalmente
- Apenas mobile — desktop pode manter o mesmo comportamento

### Arquivo modificado
- `src/components/charts/RoasAnalysis.tsx` (componente `ProductPicker`)

