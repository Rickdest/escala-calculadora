

## Aplicar Design "Deep Dark" na aba ROAS (RoasAnalysis.tsx)

Refatoração puramente visual — toda lógica, estados, cálculos e props mantidos intactos.

---

### Mudanças no arquivo `src/components/charts/RoasAnalysis.tsx`

**1. Wrapper principal e Tabs**
- Wrapper: adicionar `bg-[#0a0a0a] rounded-2xl p-4 md:p-6`
- TabsList: `bg-[#121212] border border-slate-800 p-1 rounded-lg h-12`
- Triggers ativos: `data-[state=active]:bg-slate-800 data-[state=active]:text-white`
- Triggers inativos: `text-slate-500`

**2. ProductDropdown (seletor de produto)**
- Botão: `bg-[#121212] border-slate-800 hover:border-emerald-500/30`
- Dropdown aberto: `bg-[#121212] border-slate-800 shadow-2xl`
- Search bar: `bg-slate-800/50 border-slate-700`
- Hover item: `hover:bg-slate-800/50`

**3. Inputs de Gasto/Receita**
- Cards: `bg-[#121212] border-slate-800 rounded-2xl`
- Labels: `text-slate-500 uppercase text-[9px] tracking-wider`
- Inputs: `bg-slate-800/50 border-slate-700 text-white`

**4. Card de Resultado ROAS**
- Container: `bg-[#121212] border-slate-800 rounded-2xl shadow-lg`
- Label "ROAS ATUAL SIMULADO": `text-slate-500 uppercase text-[9px]`
- Valor ROAS grande: manter cores semânticas (emerald/orange/destructive)
- Lucro Estimado: emerald quando positivo, destructive quando negativo
- Barra gauge: manter lógica, ajustar fundo para `bg-slate-800`
- Labels gauge: manter grid-cols-4

**5. CostBreakdownCard (coluna direita)**
- Card: `bg-[#121212] border-slate-800 rounded-2xl shadow-lg`
- Ícone PieChart: `text-emerald-400`
- Título: `text-slate-400 uppercase`
- Label central do Donut: `text-slate-500` + valor `text-white`
- Itens de custo: dots coloridos, nomes `text-slate-400`, valores `text-white font-mono`
- Lucro Bruto destaque: `bg-emerald-900/20 border-emerald-500/20` ou `bg-red-900/20 border-red-500/20`

**6. RoasRanking**
- Título: ícone `text-emerald-400`
- Cards: `bg-[#121212] border-slate-800 hover:border-emerald-500/20`
- Badge posição #1: `bg-emerald-900/20 text-emerald-400`
- Badge posição #2: `bg-blue-900/20 text-blue-400`
- Demais: `bg-slate-800 text-slate-400`
- Textos secundários: `text-slate-500`

**7. Alertas (preço incompleto / margem insuficiente)**
- Warning: `bg-amber-900/10 border-amber-500/20`
- Error: `bg-red-900/10 border-red-500/20`

**8. Estado vazio**
- Card: `bg-[#121212] border-slate-800 border-dashed`
- Ícone: `bg-emerald-900/20 text-emerald-400`

---

### Padrão de referência (AdsDetailFullView)
- `bg-[#0a0a0a]` fundo geral
- `bg-[#121212] border-slate-800 shadow-lg rounded-2xl` cards
- Títulos `text-white`, labels `text-slate-400/500`
- Emerald para sucesso, orange para atenção, blue para info

### Arquivo modificado
- `src/components/charts/RoasAnalysis.tsx`

### O que NÃO muda
- Nenhum cálculo, variável, estado, hook ou lógica
- Donut, gauge bar, ranking — mesmos dados, apenas cores/espaçamentos

