

## Renomear App: Precify → Skalify + Novo Subtítulo na Login

### Mudanças

**Substituição global "Precify" → "Skalify"** em todos os arquivos (textos visíveis ao usuário). Keys de localStorage (`precify-theme`, `precify-current-store`, etc.) permanecem iguais para não quebrar dados existentes.

**Arquivos afetados (~14):**

1. `index.html` — title, meta description, og:title, twitter:title → "Skalify"
2. `src/pages/Auth.tsx` — h1 "Skalify", subtítulo → "Precificação inteligente e gestão de Ads orientada por dados", social proof "+200 vendedores já usam o Skalify"
3. `src/pages/Home.tsx` — PageHeader title → "Skalify"
4. `src/components/layout/Sidebar.tsx` — logo text "Skalify" (expanded), "S" (collapsed), WhatsApp URL text
5. `src/components/layout/DesktopHeader.tsx` — fallback store name "Skalify"
6. `src/components/SubscriptionModal.tsx` — "Desbloqueie o Skalify"
7. `src/pages/Paywall.tsx` — alt text e heading "Skalify"
8. `src/pages/Profile.tsx` — "Acesso completo ao Skalify"
9. `src/pages/Settings.tsx` — WhatsApp URL text
10. `src/lib/exportUtils.ts` — footer "| Skalify"
11. `src/components/roas/ShareResult.tsx` — "Calculado com Skalify"
12. `src/pages/ProductDetail.tsx` — "Calculado com Skalify"
13. `src/components/ProductDetailDrawer.tsx` — "Calculado com Skalify"
14. `src/components/home/BannerCarousel.tsx` — "Precifique" → manter (é verbo de ação, não nome da marca)

**Não alterar:**
- Keys de localStorage (evitar perda de dados)
- Layout, funcionalidade, navegação
- Cores, bordas, estilos

