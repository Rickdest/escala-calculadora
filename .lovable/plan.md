

## Fix: Tabs Overflow + Reduzir Margem Superior

### Arquivo: `src/components/roas/AdsDetailFullView.tsx`

**1. Tabs saindo da tela (linhas 667-681)**

O texto "Diagnóstico & Ação" e "Métricas & Histórico" é longo demais para 390px. Solução:
- Reduzir font para `text-xs` nos TabsTrigger
- Esconder ícones no mobile (apenas texto)
- Ou abreviar: "Diagnóstico" e "Métricas"

Mudança concreta:
- `TabsTrigger`: adicionar `text-xs sm:text-sm` e esconder ícones com `hidden sm:inline`
- Reduzir `h-11` → `h-10` e `h-9` → `h-8`

**2. Margem grande entre header e Voltar (linha 537-539)**

- Linha 537: remover `pt-1` → sem padding top no breadcrumb
- O container principal tem espaços desnecessários. Reduzir `mb-3` do breadcrumb para `mb-2`, e `mb-3` do header card para `mb-2`

### Resumo das mudanças
- Linha 539: `pt-1` → remover, `mb-3` → `mb-2`
- Linha 556: `mb-3` → `mb-2`
- Linha 667: `h-11` → `h-10`
- Linhas 668-680: TabsTrigger `text-sm` → `text-xs sm:text-sm`, ícones com `hidden sm:inline`, `h-9` → `h-8`

