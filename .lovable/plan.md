

## Diagnóstico geral — auditoria de layout de toda a ferramenta

Após capturar todas as telas principais (Home, Produtos, Calculadoras, Performance, Ads/ROAS, Integrações, Estoque) e cruzar com o código, identifiquei **um problema-raiz** que se manifesta em diferentes graus em quase todas as páginas:

### Problema raiz: ausência de container global com largura máxima

`AppLayout` (linha 50) define `<main className="w-full px-4 md:px-8 xl:px-12">` **sem `max-width`**. Cada página então decide seu próprio max-width (alguns têm, outros não), gerando inconsistência:

| Página | max-width atual | Status |
|---|---|---|
| Home | nenhum (`w-full`) | ❌ Cards cortam à direita |
| Produtos | nenhum | ❌ Conteúdo cola na borda direita |
| Performance | nenhum | ❌ Tabela corta, KPIs muito largos |
| ROAS / Ads | nenhum | ❌ Inputs gigantes, conteúdo grudado |
| Estoque | nenhum | ❌ Vazio enorme no centro |
| Integrações | `max-w-2xl` (672px) | ⚠️ Estreito demais |
| Calculadoras | `max-w-4xl` (896px) | ⚠️ Card de resultado vazio à direita |
| AdminBanners | `max-w-2xl` | ⚠️ Estreito demais |
| ProductDetail | `max-w-6xl` (1152px) | ✅ OK (já refatoramos) |

### Outros problemas transversais

1. **Páginas com Tab bar (Produtos, Calculadoras)** — tabs ocupam largura inteira sem alinhamento com o conteúdo, ficam esticadas
2. **Cards de KPI inconsistentes** — Performance tem 4 cards em linha bonita; Estoque tem 4 cards minúsculos no topo; Home tem CalculadoraRápida com inputs em 1 coluna desperdiçando espaço
3. **CTA flutuante "Novo Produto"** sobreposto ao conteúdo — ok em mobile, mas em desktop polui o card embaixo
4. **Sidebar cinza-fora** — quando a sidebar está aberta (200px), o conteúdo útil em viewport 1024 fica com ~720px, mas o app trata como desktop "cheio"
5. **Padding lateral inconsistente** — alguns cards usam `p-4`, outros `p-5`, outros `p-6`

## Solução — sistema de layout unificado (Opus 4.7 Designer)

Princípio: **um container global responsivo + decisões de densidade por página**, sem refazer cada tela do zero.

### 1. AppLayout: criar wrapper de conteúdo com max-width semântico

Em vez de cada página repetir `max-w-Xxl mx-auto`, padronizar via classe utilitária no `index.css`:

```css
.page-container {
  @apply w-full mx-auto;
  max-width: 1200px;        /* ~7xl, cabe bem em 1366+ com sidebar */
}
.page-container-narrow {     /* formulários, settings */
  @apply w-full mx-auto;
  max-width: 720px;
}
.page-container-wide {       /* tabelas pesadas (Performance) */
  @apply w-full mx-auto;
  max-width: 1400px;
}
```

E `AppLayout` mantém o padding lateral, mas ganha um wrapper interno opcional. Isso preserva o comportamento atual de páginas que já têm seu próprio max-w.

### 2. Aplicar containers por página (mudança 1 linha cada)

| Página | Atual | Novo |
|---|---|---|
| Home | `w-full` | `page-container` |
| Produtos | `w-full` | `page-container` |
| Performance | `w-full` | `page-container-wide` (tem tabela) |
| ROAS / Ads | `w-full` | `page-container` |
| Estoque | `w-full` | `page-container` |
| Calculadoras | `max-w-4xl` | `page-container` (mais largo) |
| Integrações | `max-w-2xl` | `page-container-narrow` (720px em vez de 672) |
| AdminBanners | `max-w-2xl` | `page-container-narrow` |

### 3. Refinos pontuais de alta prioridade

**Home** (problema visível na screenshot — cards cortam):
- CalculadoraRápida vai para grid 2 colunas em desktop (custo + preço lado a lado, embalagem embaixo) em vez da coluna única atual
- Bloco "Outras Plataformas" vira carrossel ou grid 5 colunas em vez de scroll horizontal cortado

**Estoque** (KPIs mínimos + vazio gigantesco):
- Aumentar peso visual dos 4 KPIs (como em Performance) — adicionar valores em destaque, não só ícone
- Empty state centralizado com max-w controlado, não esticado

**Calculadoras** (card de resultado vazio à direita):
- Em vez de 1:1, usar grid `md:grid-cols-[1fr_1fr] xl:grid-cols-[2fr_3fr]` — formulário menor, resultado maior (resultado tem mais info)
- Quando vazio, mostrar preview/exemplo em cinza claro em vez de string solta

**Tabs (Produtos, Calculadoras, Ads)**:
- Limitar largura das tabs ao container (já vai resolver com page-container)
- Padronizar altura `h-11`, fonte `text-sm font-semibold`

**Integrações**:
- 720px em vez de 672 dá respiro real
- Cards Shopee Seller / Shopee Ads em grid 2 colunas em desktop xl, em vez de empilhados

### 4. Tokens de espaçamento consolidados

Adicionar ao `index.css`:
```css
.surface-card { @apply bg-surface border border-border rounded-2xl p-5; }
.section-gap > * + * { margin-top: 1.25rem; }  /* 20px entre seções */
```

Substitui `space-y-5` solto por classe semântica.

## Arquivos a modificar

**Setup (1 arquivo):**
- `src/index.css` — adicionar 3 utilitárias (`.page-container`, `.page-container-narrow`, `.page-container-wide`)

**Aplicação do container (8 arquivos, 1-2 linhas cada):**
- `src/pages/Home.tsx`
- `src/pages/Products.tsx`
- `src/pages/Performance.tsx`
- `src/pages/Roas.tsx`
- `src/pages/Stock.tsx`
- `src/pages/Calculators.tsx`
- `src/pages/Integracoes.tsx`
- `src/pages/AdminBanners.tsx`

**Refinos visuais pontuais (3 arquivos):**
- `src/components/home/QuickCalculator.tsx` — grid 2 colunas em desktop
- `src/pages/Stock.tsx` — KPIs com valores em destaque + empty state controlado
- `src/pages/Calculators.tsx` — proporção do grid resultado/formulário

## O que **NÃO** muda

- Tokens de cor (Bg #111111, Cards #1a1a1a, Accent #e85d00) — intactos
- Sidebar, BottomNavigation, DesktopHeader — intactos
- Lógica de cálculo, estados, hooks — intactos
- ProductDetail e ProductForm — já refatorados, ficam
- Mobile — todos os max-w já vinham de breakpoints `md:`, mobile mantém comportamento atual

## Resultado esperado

- Conteúdo nunca mais cola na borda direita (sumiço do "vazio à direita")
- Largura visual consistente em todas as telas (sensação de "produto único", não 8 páginas com regras próprias)
- Tabelas e KPIs respiram nos cantos, com hierarquia clara
- Em desktop largo (1920px), conteúdo não estica grotescamente — fica centrado num "cartão de leitura" largo

