

## Plano: Redesenhar Seção de Métricas da Home

### Arquivos alterados

1. **`src/pages/Home.tsx`** — linhas 147-233
2. **`src/components/home/HomeEducationCard.tsx`** — remover ícone

### Alterações

**1. Métricas da Loja (linhas 147-174)** — Manter estrutura de 2 cards grid, remover emoji do status da margem. Exibir apenas `{label} ●` sem emoji prefix.

**2. Performance cards (linhas 176-194)** — Substituir os 2 cards separados por UMA linha horizontal única:
- Container: `surface-card` com `rounded-[10px] px-4 py-3 flex items-center justify-center gap-2`
- `{productsAboveTarget}` em DM Mono 14px bold text-success + `na meta` em 13px text-2
- Separador `·` em text-3
- `{productsBelowTarget}` em DM Mono 14px bold (warning se > 0, text-3 se = 0) + `abaixo da meta` em 13px text-2
- Sem ícones CircleCheck/AlertTriangle — remover imports não usados

**3. HomeEducationCard** — Remover o `<GraduationCap>` icon. Manter tudo mais igual.

**4. Seus Produtos (linhas 200-233)** — Reestruturar cada item:
- Remover badge numérico (1, 2, 3) com fundo laranja/surface-2
- Layout em 2 linhas por produto:
  - Linha 1: Nome do produto (15px text-foreground)
  - Linha 2: `R$ X,XX lucro · 10.0% ●` (DM Mono 13px, cores por status)
- Manter `surface-card divide-y divide-border`

**5. Cleanup** — Remover `CircleCheck`, `AlertTriangle` dos imports se não usados em outro lugar.

