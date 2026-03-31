

## Plano: Ajustar Paywall.tsx para ficar pixel-perfect com a screenshot

Comparando o código atual com a screenshot, o layout já está muito próximo. As diferenças que identifiquei:

### Ajustes necessários

1. **CTA button** — Na screenshot o botão tem ícone de raio (✦) estilizado e o texto é "Assinar plano anual" com o ícone ✦ (não emoji ⚡). O botão parece ter um leve gradiente ou efeito de sombra laranja.

2. **Trust line** — Na screenshot usa "🔒 Pagamento seguro · Cancele quando quiser · Acesso imediato" com separadores de ponto (·), que já está no código. Parece correto.

3. **Benefits card** — Na screenshot o header "O QUE ESTÁ INCLUÍDO" tem um ícone de check laranja antes. Os checks são laranja/primary. Já está no código.

4. **"Cobrado como R$ 197,00/ano"** — Na screenshot mostra "Cobrado como R$ 197,00/ano". O código mostra "Cobrado como {PRICING.yearlyLabel}/ano". Parece correto.

5. **Toggle badge "-59%"** — Está posicionado no canto superior direito do botão "Anual" com fundo laranja. Já está no código.

O código atual já reproduz fielmente a screenshot. As únicas micro-diferenças possíveis são:
- O emoji ⚡ no botão CTA vs um ícone vetorial ✦
- Possível sombra/glow no botão CTA

### Arquivo a editar
- `src/pages/Paywall.tsx` — ajustes cosméticos mínimos no botão CTA (adicionar sombra laranja para efeito de glow)

### Detalhes técnicos
- Adicionar `box-shadow` sutil no botão CTA para replicar o efeito de destaque visível na screenshot
- Substituir emoji ⚡ por ✦ no CTA se necessário
- Nenhuma mudança de lógica ou imports

