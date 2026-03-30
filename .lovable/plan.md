

## Remover pills e destacar nome + slogan na tela de login

### Mudanças em `src/pages/Auth.tsx`

**1. Remover feature pills**
- Remover o array `featurePills` (linhas 27-32) e os imports `TrendingUp, Target, Zap, BarChart3`
- Remover o bloco JSX das pills (linhas 115-130)

**2. Dar mais destaque ao nome e slogan**
- "Skalify": aumentar de `text-[28px]` para `text-[36px]`, adicionar `tracking-[-0.02em]`
- Slogan: aumentar de `text-[13px]` para `text-[15px]`, cor de `#888888` para `#aaaaaa`, adicionar `max-w-[280px]` para quebra de linha mais elegante
- Aumentar espaçamento entre nome e slogan com `space-y-4`

### Resultado
Header mais limpo e impactante: nome grande + slogan legível, sem as pills ocupando espaço visual.

