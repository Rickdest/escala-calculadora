

## Análise do problema

A aba **Análise** está visualmente datada vs o resto do app que já tem o "Claude Designer" aplicado (Detalhe do Produto, Tendência). Hoje:

- 2 KPIs gigantes em cima (Margem Média + Lucro Total) — pouco denso
- Card "Resumo de Performance" repete 4 números num grid 2x2 sem cor/hierarquia
- 3 charts em cards `glass-card` genéricos, sem coesão
- **Sem busca** no ranking — impossível achar um produto específico entre 32+
- Ranking sem barras visuais, sem custos/preço, sem indicador de problema
- Sort como pills horizontais com scroll lateral (UX antiga)

## Solução: redesign + busca no ranking

### S1 — Hero de KPIs 2x2 (estilo ProductDetail)

Trocar os 2 KPIs por **4 stat tiles densos** com ícone + border-l semântica:

| Tile | Métrica | Ícone | Cor borda |
|---|---|---|---|
| Margem média | `8.5%` | `Percent` | semântica (success/warning/danger) |
| Lucro total | `R$ 1.234` | `DollarSign` | success/danger |
| Na meta | `1 de 32` | `Target` | primary |
| Sem custo | `31` (alerta) | `AlertCircle` | warning/danger |

Mobile: `grid-cols-2`, valores `text-xl` (não `text-2xl`).

### S2 — Remover card "Resumo de Performance" redundante

Os 4 números (melhor/pior margem, na/fora meta) já viram parte do hero ou ficam num **mini-card de "destaque" compacto** abaixo:
- Melhor produto → nome + margem (verde) — clicável
- Pior produto → nome + margem (vermelho) — clicável
- Linha "Meta de margem: 15%" mantida só como sub-info

### S3 — Charts mais coesos (estilo unificado)

Substituir `glass-card p-5` por `surface-card p-4` (mesma classe usada no resto) com:
- Header padrão com `section-label` + valor sumário pequeno à direita
- Charts com altura `h-[160px]` (mais densos)
- Mobile: `grid-cols-1`, desktop `grid-cols-3`
- **Distribuição de Margem**: virar **stack bar horizontal** em vez de pizza (mais legível em mobile, padrão Claude). Mostra "Acima 1 (3%)" + "Abaixo 31 (97%)" com barra vermelha+verde
- **Top 5 e Lucro por Produto**: manter mas com cores semânticas (positivo=success, negativo=destructive)

### S4 — **Campo de busca + filtros no ranking** (principal pedido)

Acima da lista "Ranking de Produtos", adicionar:

```
┌──────────────────────────────────────────┐
│ 🔍 Buscar produto...        [⇅ ordenar] │
├──────────────────────────────────────────┤
│ [Todos] [Lucrativos] [Atenção] [Prejuízo]│
└──────────────────────────────────────────┘
```

- Input de busca igual à aba Produtos (`Search` icon, `h-10`, `bg-surface-2`)
- Dropdown de ordenação substitui as pills horizontais
- **Chips de filtro rápido por status de margem** (Todos/Lucrativo ≥17%/Saudável 10-17%/Atenção 0-10%/Prejuízo <0%) com contagem

### S5 — Ranking aprimorado

Cada linha vira:
```
#1  [thumb 36px] Calça Legging…      29.0%  ↗
                R$ 39,90 · custo R$ 18  R$ 11,52
                ━━━━━━━━━━━━━━━━━░░ (barra de margem)
```

- Thumbnail pequeno do produto (já tem `ProductThumbnail`)
- Nome truncado + preço/custo na sub-linha
- Margem grande à direita com seta
- **Barra horizontal proporcional** mostrando margem vs meta
- Click → navega pra `/products/:id` (já existe pattern)
- Top 3 ganham destaque visual (`bg-primary/5`)

### S6 — Mobile-first refinado

- Hero: `grid-cols-2 gap-2`, padding reduzido
- Charts: 1 coluna empilhada
- Ranking: thumb 32px, fontes menores
- Sticky header dos filtros (igual TabsList) `sticky top-0` opcional

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | Reescrever conteúdo da aba `analysis`: hero 4 tiles, busca+filtros+sort, ranking aprimorado, remover card resumo redundante |
| `src/components/charts/AnalyticsCharts.tsx` | Trocar `glass-card` → `surface-card`, `MarginDistributionChart` virar stack bar, alturas reduzidas, cores semânticas |

Sem novos arquivos. Sem mudança de lógica/cálculos.

## Trade-offs

- ✅ Visual unificado com ProductDetail (filosofia Claude Designer)
- ✅ Busca + filtros por status resolvem o problema de "não acho meu produto" com 32+ itens
- ✅ Stack bar substitui pizza (mais legível em mobile estreito)
- ✅ Ranking com barra visual mostra margem vs meta de forma instantânea
- ⚠️ Remover "Resumo de Performance" pode incomodar usuários acostumados — mitigado pelos 4 tiles + destaques de melhor/pior produto
- ⚠️ Adicionar busca/filtros adiciona ~80px de altura — vale pela funcionalidade

