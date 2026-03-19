

## Plano: Destacar botões de compra na Home

### Problema
Os CTAs de assinatura na Home (trial e expirado) estão com visual apagado — mesmo fundo e borda dos outros cards, sem contraste. Parecem informação passiva, não ação.

### Alterações em `src/pages/Home.tsx`

**Card trial (linha ~110):**
- Trocar fundo para `bg-[#1e3a5f]/60` com borda `border-[#1e3a5f]/40` — tom azul escuro sutil que diferencia do resto
- Adicionar seta `ChevronRight` à direita para reforçar clicabilidade
- Texto "Garanta seu acesso" em `font-semibold text-primary` para dar destaque

**Card expirado (linha ~123):**
- Fundo `bg-[#F97316]/8` com borda `border-[#F97316]/20` — halo laranja sutil
- Adicionar botão inline `Assinar →` em laranja (`text-[#F97316] font-bold`) à direita
- Ícone ⚡ levemente maior
- Texto principal mais impactante: "Seu acesso expirou" com subtítulo "R$49,90/ano — menos de R$4,16/mês"

### Regras
- NÃO alterar lógica, cálculos ou outros componentes
- Manter responsivo para 375px+
- Sem gradientes animados, sem sombras exageradas

