

## Plano: Layout Desktop estilo Hotmart/Kiwify/Shopee Seller Center

### Conceito

Transformar o layout de "app mobile com max-w-lg" para um layout profissional de painel administrativo no desktop, mantendo a experiência mobile intacta.

```text
MOBILE (< 768px)                    DESKTOP (>= 768px)
┌──────────────┐                    ┌────────┬───────────────────────────┐
│   Header     │                    │        │  Header (breadcrumb)     │
│──────────────│                    │  Side  │──────────────────────────│
│              │                    │  bar   │                          │
│   Content    │                    │        │   Content (max-w-5xl)    │
│  (max-w-lg)  │                    │  Nav   │                          │
│              │                    │  240px │   Grid 2-3 cols          │
│──────────────│                    │        │                          │
│  Bottom Nav  │                    │        │                          │
└──────────────┘                    └────────┴───────────────────────────┘
```

### Arquivos alterados

1. **`src/components/layout/AppLayout.tsx`** — Layout responsivo com sidebar
2. **`src/components/layout/Sidebar.tsx`** — Nova sidebar para desktop
3. **`src/components/layout/BottomNavigation.tsx`** — Esconder no desktop (md:hidden)
4. **`src/components/layout/PageHeader.tsx`** — Adaptar padding/max-width no desktop
5. **`src/pages/Home.tsx`** — Grid responsivo nas métricas e produtos
6. **`src/pages/Products.tsx`** — Grid responsivo na análise
7. **`src/index.css`** — Ajustes no bottom-nav

### Detalhes

**1. Sidebar (novo componente)**
- Largura fixa 240px, fundo surface (#13161F), borda direita border
- Logo "Precify" no topo (20px bold)
- Itens de navegação: mesmos do BottomNavigation + Estoque, Lojas, Perfil
- Item ativo: fundo primary/10, texto primary, borda esquerda 3px primary
- Item hover: bg-surface-2
- Ícone 20px + label 14px, padding 10px 16px
- Seletor de loja compacto no rodapé da sidebar
- Visível apenas em `md:` e acima

**2. AppLayout refatorado**
- Mobile: mantém estrutura atual (content + bottom nav)
- Desktop: `flex` com sidebar fixa à esquerda + área de conteúdo fluida
- Conteúdo desktop: `max-w-5xl` com padding generoso (px-8 py-6)
- Remove `max-w-lg` no desktop

**3. BottomNavigation**
- Adicionar `md:hidden` para esconder no desktop

**4. PageHeader**
- Desktop: remover sticky em telas grandes (sidebar já tem nav)
- Aumentar título para 24px no desktop
- Seletor de loja move para sidebar no desktop

**5. Home — grids responsivos**
- Métricas: `grid-cols-2 md:grid-cols-4` (margem, produtos, na meta, abaixo da meta — tudo numa linha)
- Ferramentas: `grid-cols-4 md:grid-cols-8` no desktop (uma linha)
- Calculadora + Produtos: `md:grid md:grid-cols-2 md:gap-6` lado a lado
- Card educação: largura parcial no desktop

**6. Products — grids responsivos**
- Gráficos de análise: já tem `md:grid-cols-2 lg:grid-cols-3`
- Lista de produtos: manter layout atual mas com mais espaço

