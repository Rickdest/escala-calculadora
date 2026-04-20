

## Diagnóstico (image-271, image-272)

Usuário quer:
1. **Reverter as tabs Produtos/Análise** ao estado anterior (cheias, largas, h-11 grid full-width) — ou deixar **maior/melhor** que como ficaram agora (compactas h-9 inline)
2. **Melhoria real era nos KPI tiles** (image-271) — não nas tabs

## Plano

### A. Restaurar tabs grandes (image-272 mostra estado antigo bom)

`Products.tsx`:
- Voltar `TabsList` para `grid grid-cols-2 h-11 w-full` (estado anterior, full-width, aba ativa laranja sólida)
- Manter o resto da toolbar (botão "Importar Shopee" + chip "31 sem custo" + dropdown export) na **linha de cima**, separada das tabs — igual era antes
- Layout final:
  ```
  [Importar Shopee] [⚠ 31 sem custo]                [⬇ export]
  [───── Produtos (32) ─────] [───── Análise ─────]
  ```
- Tabs voltam ao tamanho anterior (cheias, dominantes, claras)
- Chip "sem custo" continua **clicável** (mantém melhoria funcional do passo anterior)

### B. Melhorar KPI tiles (image-271 — onde realmente queria mudança)

Problemas visuais nos KPIs atuais:
1. **Margem 0.9%** com lista Best/Worst embaixo está OK mas comprime os outros 3 tiles
2. **Lucro R$ 15,92** — barra verde gigante full-width sem contexto (parece progress bar mas é meramente decorativa)
3. **Na Meta 1/32** — barra laranja minúscula (3% no alvo), texto "Acima de 15% de margem" cinza apagado
4. **Sem Custo 31** — barra vermelha full-width igual à do Lucro (verde) cria **incoerência semântica** (verde=bom, vermelho=ruim, mas ambos full = "100%"?)

**Refinamentos propostos**:

**KPI Lucro**:
- Remover barra verde full-width decorativa (não representa nada)
- Trocar por **delta vs período anterior** se disponível, ou pequeno ícone TrendingUp + texto "Lucro líquido total" mais legível
- Se não houver delta, usar mini-sparkline visual (linha simples) em vez de barra plana

**KPI Sem Custo**:
- A barra vermelha full-width é alarmante demais e enganosa. Trocar por **proporção real**: largura = `noCost / total` (31/32 = 97%, ainda alarmante mas honesto)
- Texto "preencher custo" → "31 de 32 produtos" (concreto)
- Footer "Toque para filtrar →" mais visível: aumentar pra `text-xs font-medium text-destructive` com ícone seta

**KPI Na Meta**:
- Barra laranja muito fina (3%) — aumentar visibilidade com bg-surface mais escuro pra contraste
- Footer "Acima de 15% de margem" muito apagado → reforçar contraste `text-muted-foreground` → `text-text-2`

**KPI Margem (com Best/Worst)**:
- Manter estrutura mas dar mais respiro entre Best e Worst (`space-y-1.5` em vez de denso)
- Tornar Best/Worst **clicáveis** (clicar abre detalhe do produto)

### C. Alinhamento visual entre os 4 KPIs

- Manter `min-h-[160px]` igual em todos
- Padding interno consistente `p-3.5`
- Ícone topo-esquerda + label uppercase já estão bons, só polir cor semântica

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | (1) Reverter TabsList para `grid grid-cols-2 h-11 w-full` (tabs grandes); (2) Mover toolbar (Importar/Sem custo/Export) pra linha separada acima das tabs; (3) Refinar 4 KPI tiles: Lucro sem barra decorativa (vira delta/sparkline), Sem Custo com largura proporcional real (31/32), Na Meta com barra mais visível, Best/Worst clicáveis |

Sem mudanças em `AnalyticsCharts.tsx`, backend, ou outros arquivos.

## Trade-offs

- ✅ Tabs voltam ao tamanho que usuário gostava (grandes, full-width)
- ✅ KPIs mais honestos visualmente (barras representam dados reais, não decoração)
- ✅ Toolbar mantém funcionalidade adicionada (chip "sem custo" clicável)
- ⚠️ Topo ganha 1 linha de altura de volta (toolbar + tabs separados) — aceitável, era o estado preferido

