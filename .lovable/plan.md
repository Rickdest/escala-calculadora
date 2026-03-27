

## Redesign High-Fidelity do AdsDetailFullView.tsx

Refatoração puramente visual — toda lógica, estados, cálculos e props mantidos intactos.

---

### Mudanças Globais

- Fundo da página: `bg-[#0a0a0a]` no wrapper principal
- Cards: `bg-[#121212] border-slate-800 shadow-lg rounded-2xl`
- Textos: títulos `text-white`, labels `text-slate-400/500`
- Cores semânticas: emerald (sucesso), orange (custo/atenção), blue (gasto/info)

---

### 1. Cabeçalho + KPIs (topo)

- Card do produto com efeito glow: `relative overflow-hidden` + `<div className="absolute -top-20 -right-20 w-60 h-60 bg-green-500/5 blur-3xl rounded-full" />`
- Badge "Ativo" com `bg-emerald-900/30 border-emerald-500/50 text-emerald-400`
- ID do produto em `text-slate-500 font-mono`
- Período no canto superior direito em `text-emerald-400`

**KPIs grid `grid-cols-3 md:grid-cols-6`**:
- 5 KPIs normais: fundo `bg-slate-800/50 border-slate-700` com labels `text-slate-500 uppercase text-[9px]` e valores `text-white text-lg font-bold font-mono`
- KPI de ROAS (último): destaque com `bg-emerald-900/20 border-2 border-emerald-500/50`, label `text-emerald-400 uppercase`, valor `text-2xl font-black text-emerald-400`

---

### 2. Tabs

- TabsList: `bg-[#121212] border border-slate-800 p-1 rounded-lg h-12`
- Aba 1: ícone `Target` + "Diagnóstico & Ação"
- Aba 2: ícone `TrendingUp` + "Métricas & Histórico"
- Trigger ativo: `data-[state=active]:bg-slate-800 data-[state=active]:text-white`
- Trigger inativo: `text-slate-500`

---

### 3. Aba "Diagnóstico & Ação" — 3 linhas

**Linha 1: grid `md:grid-cols-3 gap-4`**
- Col-span-2: "Status: ROAS Real vs Empate"
  - Barra `h-4 rounded-full bg-slate-800` com fill `bg-gradient-to-r from-orange-500 via-emerald-400 to-emerald-500`
  - Marcador de empate: `w-0.5 bg-slate-400 absolute`
  - Labels: "Prejuízo" esquerda, "Lucro Excelente" direita em `text-slate-400`
  - Valores abaixo: ROAS Atual, Empate (Zero a Zero), Margem de Segurança (+X%)
- Col-span-1: "Diagnóstico da IA"
  - Fundo `bg-gradient-to-br from-emerald-900/40 to-[#121212] border-emerald-500/30`
  - Ícone `Sparkles` (lucide) em emerald
  - Título do diagnóstico em `text-white text-lg font-bold`
  - Ação recomendada em `text-emerald-400 font-bold`

**Linha 2: grid `md:grid-cols-2 gap-4`**
- Esquerda: "Meta de ROAS Sugerida"
  - 3 botões selecionáveis (Agressivo/Equilibrado/Conservador)
  - Visual de cada: `bg-slate-800/50 border-slate-700 rounded-xl p-4`
  - Labels: Agressivo=`text-emerald-400`, Equilibrado=`text-emerald-400`, Conservador=`text-emerald-400`
  - Valor: `text-xl font-black font-mono text-white`
  - Sub: "Máx. Volume", "Recomendado", "Máx. Margem" em `text-slate-500`
- Direita: "Orçamento Diário"
  - Atual vs Sugerido com `ArrowRight` entre eles
  - Valores em `text-2xl font-black font-mono`
  - Sugerido em `text-emerald-400`
  - CTA: `bg-emerald-600 hover:bg-emerald-500 text-white w-full rounded-xl h-12 text-sm font-bold`

**Linha 3: grid `md:grid-cols-2 gap-4`**
- Esquerda: "ACOS vs Margem de Contribuição"
  - Barras `h-2.5 rounded-full`: ACOS=`bg-orange-400`, Margem=`bg-emerald-500`
  - "Lucro Líquido Final" com valor em `text-emerald-400 font-bold`
- Direita: "Economia por Venda (Ticket: R$ X)"
  - 3 linhas: Custo Produto+Taxas (`bg-slate-800/30`), Custo Anúncio CPA (`bg-orange-900/10 text-orange-400 border-orange-500/20`), Lucro Limpo (`bg-emerald-900/20 border-emerald-500/20 text-emerald-400`)

---

### 4. Aba "Métricas & Histórico" — 2 linhas

**Linha 1: largura total** — "Histórico de Performance (X dias)"
- Manter `OperationLogTimeline` mas ajustar wrapper para `bg-[#121212] border-slate-800`
- No gráfico: converter de `LineChart` para `AreaChart` com fill gradiente emerald translúcido
- Linha de gasto: `strokeDasharray="5 5"` cor blue `#3b82f6`
- ReferenceLine de ajustes: cor amber `#f59e0b` pontilhada
- Legend: "ROAS" com dot emerald, "Gasto (R$)" com dot blue

**Linha 2: grid `md:grid-cols-2 gap-4`**
- Esquerda: "Posicionamento do Anúncio"
  - 3 barras horizontais simples: Top 3 (`bg-blue-500`), Página 1 (`bg-blue-400`), Página 2+ (`bg-slate-600`)
  - Labels com % à direita
- Direita: "Geral vs Direto"
  - Tabela: header `bg-slate-800/50 text-slate-400 uppercase text-xs`
  - Linhas com `border-slate-800`
  - ROAS Busca Exata em `text-emerald-400 font-bold`
  - Insight box abaixo da tabela com ícone `Info`

---

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx` (apenas visual, ~1044 linhas reescritas na camada de UI)

### O que NÃO muda
- Nenhum cálculo, variável, estado, hook, prop ou lógica de negócio
- Todos os dados reais continuam exibidos
- Componentes auxiliares (`OperationLogTimeline`, `KpiCard`) mantêm sua lógica, apenas estilo atualizado

