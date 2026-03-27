

## Ajustar estilo dos cards de Ads para corresponder ao screenshot

### O que muda

**`src/components/roas/AdsProductCard.tsx`** — ajustar apenas os estilos visuais dos botões e badge para corresponder exatamente ao screenshot:

1. **Badge "Não vinculado"**: manter o estilo verde com ícone de corrente (🔗) como está no screenshot — badge com fundo verde/primary e texto branco
2. **Botão "Vincular"**: estilo escuro com borda (`bg-card border border-border text-foreground`) — visual mais neutro/outline
3. **Botão "+ Cadastrar"**: estilo outline com texto laranja/primary (`border border-primary text-primary bg-transparent`) — destaque de cor sem fundo sólido
4. **Warning**: manter o ícone ⚠️ com texto "Vincule para ver lucratividade"
5. **Cards vinculados**: sem área de ações no rodapé (apenas métricas), mantendo o botão de trocar vínculo no ícone do header

### Lógica preservada
- Nenhuma alteração em hooks, cálculos ou estado
- Apenas classes Tailwind nos botões e badge

### Arquivo modificado
- `src/components/roas/AdsProductCard.tsx`

