

## Plano: Corrigir "Dados insuficientes" na aba IA & Ação

### Problema
Mesmo com preço (49,9) e custo (20) preenchidos na seção "Economia por Venda", o card "Status ROAS Real vs Empate" mostra "Dados insuficientes para classificação" e exibe um botão "Vincular Produto" redundante. Isso acontece porque a classificação depende de `empateResult`, que só é calculado quando há um `product` vinculado. Os valores digitados manualmente não alimentam os cálculos de classificação.

### Solução

Usar `costFormSalePrice` e `costFormCost` como fallback para calcular `roasEmpate` quando não há produto vinculado, permitindo que todos os cards de IA funcionem com dados manuais.

### Mudanças em `src/components/roas/AdsDetailFullView.tsx`

1. **Fallback no `empateResult`** (linha ~650): quando `product` é null mas `costFormSalePrice > 0` e `costFormCost > 0`, construir um produto sintético com esses valores e calcular `calcularRoasEmpate` com ele e o `config` da loja.

2. **Remover botão "Vincular Produto" redundante** do card de Status (linha ~1182): já existe esse botão na seção superior do detalhe; o duplicado dentro do "dados insuficientes" confunde.

3. **Trocar mensagem fallback**: em vez de "Dados insuficientes", mostrar "Preencha preço e custo abaixo para ver a classificação" — orientando o usuário a usar a seção Economia por Venda.

### Resultado
- Com preço e custo preenchidos, classificação, meta ROAS e diagnóstico IA funcionam mesmo sem produto vinculado
- UX mais clara: o usuário sabe o que fazer para ativar a análise

