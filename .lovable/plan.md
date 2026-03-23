

## Redesign da Aba Ads — Consistencia Visual com o Design System

### Problema

A aba Ads usa classes genéricas (`text-muted-foreground`, `bg-secondary`, `bg-card`) em vez dos design tokens padronizados do app (`text-text-2`, `text-text-3`, `bg-surface-2`, `.section-label`). Elementos estão comprimidos com `p-3` e `gap-2` onde o restante do app usa espaçamentos mais generosos. Falta hierarquia visual entre seções.

### Alteracoes

#### Arquivo 1: `src/components/roas/AdsTab.tsx`

**SummaryCards** — Redesenhar os 3 cards de resumo:
- Trocar `p-3` por `p-4`, `gap-2` por `gap-3`
- Labels: usar classe `section-label` (`text-[9px] uppercase tracking-wider text-text-3 font-bold`)
- Valores: `text-xl` em vez de `text-lg`
- Adicionar um quarto card com o count total de anuncios
- Linha de semaforo: mais padding (`px-2 py-1.5`), fundo sutil (`rounded-lg bg-surface-2 p-2`)

**FilterChips** — Mais espaco:
- `gap-2` em vez de `gap-1.5`
- `py-2 px-3.5` em vez de `py-1.5 px-3`

**AdsProductCard** — Melhor hierarquia:
- `p-4` em vez de `p-3.5`
- `space-y-3` em vez de `space-y-2`
- Imagem do produto `w-12 h-12` em vez de `w-10 h-10`
- ROAS destacado com `text-xl` 
- Barra de progresso ROAS `h-2.5` em vez de `h-2`
- Metricas row com separadores visuais mais claros
- Usar `text-text-2` e `text-text-3` em vez de `text-muted-foreground`

**AlertsSection** — Formato dashboard:
- Titulo com `SectionLabel` pattern (icon + uppercase label) igual ao RoasAnalysis
- Cards de alerta com `p-3` em vez de `p-2.5`, `gap-3` em vez de `gap-2`

**Layout geral (TabsContent "overview")**:
- `space-y-6` em vez de `space-y-4` entre secoes
- Import button: estilo outline com borda dashed em vez de primary solid (menos agressivo)
- Separar visualmente secoes com spacing consistente

**EmptyState e ByProductContent**:
- Usar `bg-surface-2` em vez de `bg-secondary`
- Usar `text-text-2` e `text-text-3`

#### Arquivo 2: `src/components/roas/AdsDetailView.tsx`

**Modal container**:
- `p-5` em vez de `p-4` no body
- `space-y-5` em vez de `space-y-4` entre secoes

**Stat grid items**:
- `p-3` em vez de `p-2.5`
- Labels com `text-text-3` e `section-label` style
- Valores com `text-lg` em vez de `text-base`

**Section cards** (Custo vs Lucro, ACOS vs Margem, Config, etc):
- `p-4` em vez de `p-3`
- Titulos com padrao `SectionLabel` (icon left-aligned + uppercase bold)
- `space-y-3` em vez de `space-y-2`
- Usar `bg-surface-2` como fundo alternativo em vez de `bg-secondary/30`
- Consistencia: `text-text-2` para subtextos, `text-text-3` para labels

**Posicionamento ruler**:
- `h-10` em vez de `h-8`
- Marcador `w-7 h-7` em vez de `w-6 h-6`

### Nao altera

- Nenhuma logica de calculo, importacao CSV, vinculacao ou alertas
- Nenhum componente externo (ProductCard, hooks, adsLogic)
- Funcionalidade identica — apenas visual

