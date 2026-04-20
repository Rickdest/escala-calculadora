

## Diagnóstico (prints 266-267)

Olhando o estado atual, identifico 4 problemas reais:

### 1. Card "Pesquisar tendência" duplicado e apagado (print 267)
Quando expande, aparece **dois headers idênticos**:
- O trigger do Collapsible: "Pesquisar tendência de mercado / Avalie a demanda..."
- Logo abaixo, dentro do TrendSearchCard: "Análise de demanda / Descubra o potencial..."

Causa: `hideOuterBorder` removeu só a borda, mas não escondeu o header interno do `TrendSearchCard`. Resultado: dois títulos quase iguais, empilhados.

Além disso, o trigger fechado tem **cor muito sutil** (bg neutro + texto pálido) — não parece um botão clicável, parece label. Não comunica "ferramenta poderosa".

### 2. Gráficos da "Saúde da carteira" feios (print 266)
- **Distribuição de margem**: barra horizontal vermelha + 80% de espaço vazio embaixo. Card desperdiça altura.
- **Top 5 Margens**: labels truncados ("Calça Leggin…" 5x, indistinguíveis), apenas 1 barra visível claramente
- **Lucro por produto**: 6 barras com labels rotacionados ilegíveis, eixo Y com R$ 0/4/8/12/16 mas só 1 barra tem valor — desproporcional
- Os 3 cards têm **alturas diferentes** (visual desalinhado) e **densidade inconsistente**

### 3. Hierarquia ainda confusa
KPIs (4) → Best/Worst (2 cards) → Saúde carteira (3) → Trend → Ranking. Muitas seções competindo. Best/Worst ainda solto sem agrupar com KPIs.

### 4. Botão "Novo Produto" flutuante mal posicionado
Aparece sobreposto ao Trend collapsible (print 266) e ao Ranking (print 267) — esconde conteúdo.

## Estratégia de redesign

### A. Trend collapsible — fix duplicação + destaque visual

**Solução duplicação**: criar prop `hideHeader?: boolean` no `TrendSearchCard` (separado do `hideOuterBorder`) que esconde o `<header>` interno (Sparkles + "Análise de demanda"). Quando dentro do Collapsible, usar `hideHeader + hideOuterBorder`.

**Destaque visual do trigger fechado**: substituir o card sutil atual por um **CTA com gradiente sutil + borda primary/30 + ícone com bg-primary/15**. Comunica "ferramenta especial". Usar copy mais direta: "**Descobrir produtos vencedores**" + "Pesquise qualquer termo e veja potencial de mercado, sazonalidade e concorrência".

```
┌──────────────────────────────────────────────────┐
│ [✨]  Descobrir produtos vencedores         [→]  │  ← gradient + border
│       Pesquise demanda, sazonalidade...          │
└──────────────────────────────────────────────────┘
```

Quando aberto, o chevron rotaciona e o card vira só o conteúdo do Trend (sem header duplicado).

### B. Gráficos "Saúde da carteira" — redesign

**Distribuição de margem** (componente `MarginDistributionChart`):
- Adicionar **donut SVG 96px** ao lado da barra, com % no centro
- Ou: substituir barra horizontal + labels por **3 stat tiles** mini (Acima / Na meta / Abaixo) com %, números e mini-bar em cada
- Eliminar espaço vazio

**Top 5 Margens** (componente `TopProductsChart`):
- Trocar BarChart Recharts por **lista vertical custom** (mais legível em altura limitada):
  ```
  #1 Calça Legging Feminina...    ▓▓▓▓▓▓▓▓▓ 29.0%
  #2 Vestido Longo Safira...      ▓▓▓ 8.2%
  ...
  ```
- Cada linha: rank colorido + nome (truncate ok mas com `title`), barra proporcional fina, valor à direita
- Sem labels rotacionados, sem eixos confusos

**Lucro por produto** (componente `ProfitSummaryChart`):
- Mesmo tratamento: lista vertical com nome + barra proporcional + R$ valor
- OU substituir por **scatter/treemap simples**: blocos coloridos onde tamanho = lucro
- Mais útil seria mostrar **distribuição** (quantos lucram X) que repetir Top5 em outro formato

**Decisão**: trocar `TopProductsChart` por lista vertical, e trocar `ProfitSummaryChart` por **um único stat card grande** com: Lucro total + média + mediana + % produtos lucrativos. Evita repetir o "ranking" 3x.

**Alturas uniformes**: todos os 3 com `min-h-[260px]` + `flex flex-col` + footer alinhado.

### C. Hierarquia compactada — fundir Best/Worst nos KPIs

Hoje "Melhor margem" + "Pior margem" são 2 cards de ~80px cada = 160px de viewport. 

**Solução**: remover essa seção e adicionar no rodapé do KPI "Margem" um mini-rodapé clicável:
```
┌─ MARGEM ───────────────┐
│ %  0.9%                │
│ meta 15%               │
├────────────────────────┤
│ ↑ Calça Legging  29.0% │  ← mini-row best
│ ↓ Vestido Safira 0.0%  │  ← mini-row worst
└────────────────────────┘
```
Economiza 1 seção inteira, mantém a info onde faz sentido (dentro do contexto "margem").

### D. Botão "Novo Produto" flutuante

Hoje é `fixed` ou `sticky` mal posicionado. Solução: garantir que tem `bottom: calc(safe-area + 80px)` em mobile e em desktop fica no header da seção Ranking (não flutuante).

Verificar onde é renderizado em `Products.tsx` — provavelmente um FAB. Movê-lo pro topo da aba Produtos (não da aba Análise) ou pro header global da página.

## Resumo das mudanças

| Arquivo | Mudança |
|---|---|
| `src/components/products/TrendSearchCard.tsx` | Adicionar prop `hideHeader?: boolean` que esconde o `<header>` "Análise de demanda" interno |
| `src/pages/Products.tsx` | (1) Trigger Collapsible com gradient + border-primary/30 + copy "Descobrir produtos vencedores"; (2) Passar `hideHeader + hideOuterBorder` no TrendSearchCard; (3) Remover seção Best/Worst standalone, fundir como mini-rodapé do KPI Margem; (4) Reposicionar botão Novo Produto |
| `src/components/charts/AnalyticsCharts.tsx` | (1) `MarginDistributionChart`: donut SVG 96px + mini-stats laterais; (2) `TopProductsChart`: lista vertical custom (sem Recharts) com rank + nome + barra inline + %; (3) `ProfitSummaryChart`: substituir por stat card de "Saúde financeira" com 4 métricas (lucro total, médio, mediana, % lucrativos). Alturas uniformes `min-h-[260px]` |

Sem migrações. Sem mudança no backend. Sem mudança em outras telas.

## Trade-offs

- ✅ Trigger do Trend agora se destaca como ferramenta poderosa (gradient + border)
- ✅ Sem duplicação de header quando expandido
- ✅ Gráficos legíveis em qualquer altura, sem labels truncados/rotacionados
- ✅ Best/Worst integrado ao KPI Margem (-1 seção, +1 contexto)
- ✅ `ProfitSummaryChart` vira stat card útil em vez de repetir Top 5
- ⚠️ Lista vertical em vez de BarChart Recharts no Top 5 = perde tooltip do Recharts (mitigado: hover state CSS + valor sempre visível)
- ⚠️ Stat card de saúde financeira é **diferente** dos 2 anteriores — quebra simetria visual mas entrega mais valor

