

## Correção do Tema Claro — Tokens Unificados

### Problema
Muitos componentes usam cores hardcoded em `style={{}}` (ex: `#1a1a1a`, `#252525`, `#111111`) que só funcionam no dark mode. O light mode herda essas cores e fica inconsistente. As variáveis CSS em `:root` (light) também usam tons warm (hue 20-30) em vez dos cinzas neutros pedidos.

### Plano

**1. Atualizar variáveis light em `src/index.css` (`:root`)**

Ajustar os tokens light para os valores pedidos:
- `--background`: #F5F5F5 → `0 0% 96%`
- `--card`: #FFFFFF → `0 0% 100%`
- `--foreground`: #1a1a1a → `0 0% 10%`
- `--muted`: #F0F0F0 → `0 0% 94%`
- `--muted-foreground`: #999999 → `0 0% 60%`
- `--border` / `--input`: #E0E0E0 → `0 0% 88%`
- `--secondary`: #F0F0F0 → `0 0% 94%`
- `--secondary-foreground`: #555555 → `0 0% 33%`
- `--surface`: #FFFFFF → `0 0% 100%`
- `--surface-2`: #F0F0F0 → `0 0% 94%`
- `--text-1`: #1a1a1a → `0 0% 10%`
- `--text-2`: #555555 → `0 0% 33%`
- `--text-3`: #999999 → `0 0% 60%`
- `--success`: #2e7d32 (darker green for light bg)
- `--danger` / `--destructive`: #d32f2f
- Sidebar tokens: branco com bordas #E0E0E0

Atualizar os overrides `html:not(.dark)` para usar `#F5F5F5` nos inputs em vez de branco, e `#E0E0E0` para bordas. Placeholder: `#999999`.

**2. Substituir inline styles hardcoded por classes Tailwind theme-aware**

Nos 3 arquivos com hex hardcoded:

- **`src/pages/Home.tsx`**: Trocar `style={{ background: '#1a1a1a', border: '0.5px solid #252525' }}` por classes `bg-card border border-border`. Trocar cores de ícones de `#888888`/`#e85d00` por classes condicionais `text-primary` / `text-muted-foreground`.

- **`src/components/home/QuickCalculator.tsx`**: Trocar `style={{ background: '#111111', borderColor: '#252525' }}` dos inputs por `bg-background border-border` (que resolve para #F5F5F5/#E0E0E0 em light e #111/#252525 em dark).

- **`src/components/ProductThumbnail.tsx`**: Trocar `style={{ background: '#1e1e1e', border: '0.5px solid #252525' }}` por `bg-muted border border-border` (resolve para #F0F0F0/#E0E0E0 em light). Cor da letra: `text-muted-foreground`.

- **`src/components/layout/BottomNavigation.tsx`**: Substituir hex hardcoded por variáveis CSS com fallback. Background: `hsl(var(--background))` em vez de `#111111`. Borda: `hsl(var(--border))`. Cores ativas/inativas: usar variáveis ou classes CSS condicionais com `dark:` prefix.

**3. Adicionar shadow token para cards em light mode**

No `src/index.css`, adicionar regra:
```css
html:not(.dark) .bg-card,
html:not(.dark) [class*="surface-card"] {
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
}
```

### Arquivos modificados (~5)
1. `src/index.css` — tokens `:root` + overrides light
2. `src/pages/Home.tsx` — remover inline hex, usar classes
3. `src/components/home/QuickCalculator.tsx` — inputs theme-aware
4. `src/components/ProductThumbnail.tsx` — avatar theme-aware
5. `src/components/layout/BottomNavigation.tsx` — nav theme-aware

### Não alterar
- Bloco `.dark {}` — intocado
- Layout, funcionalidades, navegação
- Gradiente do banner
- Cores de logo das plataformas

