

## Redesign da Calculadora Rápida Shopee

Baseado na imagem de referência "Proposta", vou aplicar estas mudanças no `src/components/home/QuickCalculator.tsx`:

### 1. Borda laranja no card
- Trocar `surface-card` por card com `border-primary/40` (borda laranja sutil)

### 2. Header com badge "Shopee"
- Título: "CALCULADORA RÁPIDA" (sem "Shopee" no texto)
- Badge laranja "Shopee" alinhado à direita no header

### 3. Labels dos inputs
- "PREÇO DE CUSTO" → "CUSTO"
- "EMBALAGEM" → "EMBALAGEM (OPCIONAL)"

### 4. Cálculo reativo (sem botão "Calcular")
- Remover o botão "Calcular" e o estado `showResult`/`isCalculating`
- Mostrar resultados automaticamente quando custo e preço de venda estiverem preenchidos
- Os 3 cards de resultado (Margem, Lucro, Taxa Shopee) aparecem inline conforme o usuário digita

### 5. Cards de resultado com cores semânticas
- Card "Margem real" com borda/fundo baseado no `getMarginStatus` (verde/amarelo/vermelho)
- Card "Lucro líquido" com borda verde ou vermelha
- Card "Taxa Shopee" com borda vermelha (sempre custo)

### 6. Botão "Salvar produto"
- Substituir os dois botões ("Ver análise" + "Salvar produto") por um único botão laranja grande "Salvar produto" com ícone ⚡
- Aparece apenas quando há resultado válido
- "Ver análise" vira um link discreto abaixo

### Arquivo modificado
- `src/components/home/QuickCalculator.tsx`

