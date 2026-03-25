

## Mostrar Canais Ativos Diretamente no ProductCard

### Problema
Quando o produto tem canais configurados (`outrosCanais`), o card só mostra um botão discreto "Comparar Canais" que abre o formulário. O resultado das margens fica escondido.

### Solução
Substituir o botão "Comparar Canais" por uma **row inline** que mostra os canais ativos com suas margens, destacando o melhor canal com uma coroa 👑.

**Arquivo: `src/components/cards/ProductCard.tsx`**

1. Importar `calcOutrosCanais` e `getBestChannel` de `outrosCanaisUtils`
2. Quando `hasOutrosCanais`, calcular os resultados dos canais usando `calcOutrosCanais(product.outrosCanais, currentStore?.config?.taxes || 0)`
3. Substituir o botão "Comparar Canais" (linhas 171-178) por chips inline mostrando cada canal:

```text
┌─────────────────────────────────────────────┐
│ 👑 TikTok 18.2%  │ Shein 12.1%  │ ML -3.0% │
└─────────────────────────────────────────────┘
```

Cada chip mostra:
- Ícone 👑 no melhor canal
- Nome curto do canal (TikTok, Shein, Amazon, ML)
- Margem % com cor verde/vermelho baseada em positivo/negativo
- Clicar na row inteira abre o `onEdit(product)` como antes

4. Manter o cálculo com `useMemo` para evitar recalcular a cada render

### Resultado
- Margens de cada canal visíveis diretamente no card sem precisar clicar
- Melhor canal destacado com 👑
- Um toque ainda abre o formulário completo para editar

