

## Plano: Alinhar campos de "Outros Canais" no formulário de produto com as calculadoras

### Problema
O campo de peso da Shein no formulário de produto é um input numérico livre, enquanto na aba de calculadoras é um `select` com faixas de peso pré-definidas (0.3kg, 1kg, 2kg, 5kg, 9kg). Isso obriga o usuário a digitar manualmente um valor que já poderia estar pré-selecionado.

### Mudanças em `src/components/forms/ProductForm.tsx`

1. **Shein — Peso**: Trocar o `Input` numérico por um `select` com as mesmas faixas de peso da calculadora:
   - Até 300g — R$4,00
   - 300g até 1kg — R$5,00
   - 1kg até 2kg — R$5,00
   - 2kg até 5kg — R$6,00
   - 5kg até 9kg — R$7,00
   - Default ao ativar: `0.3` (já está correto)

2. **Amazon — Defaults ao ativar**: Adicionar `categoryRate: 0.15` e `plan: 'profissional'` ao estado inicial (já tem `categoryRate` no select mas falta no toggle)

3. **Mercado Livre — Defaults ao ativar**: Adicionar `categoryIndex: 0`, `anuncio: 'classico'` ao estado inicial do toggle

### Resultado
Campos de "Outros Canais" ficam consistentes com as calculadoras — selects pré-preenchidos em vez de inputs vazios.

