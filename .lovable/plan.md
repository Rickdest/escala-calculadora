

## Plano: Melhorar layout dos KPI cards na aba Análise de Ads (mobile)

### Problema
No viewport de 390px, os valores monetários nos cards KPI (Gasto Total, Receita GMV, ROAS, Lucro Est.) são cortados com "…" porque o espaço horizontal é insuficiente para 2 colunas com `text-xl` + ícone absoluto.

### Mudanças

**Arquivo: `src/components/roas/ApiAdsDashboard.tsx`** (linhas 128-149)

1. **Reduzir font-size no mobile** — Trocar `text-xl` por `text-lg` no mobile para os valores, mantendo `md:text-3xl` no desktop

2. **Reduzir tamanho do ícone no mobile** — De `w-7 h-7` para `w-5 h-5` (mantendo `md:w-9 md:h-9`) para dar mais espaço ao texto

3. **Ajustar padding** — De `p-3` para `p-2.5` no mobile para ganhar pixels

4. **Permitir quebra controlada** — Substituir `truncate` por `break-all` nos valores para que valores como "R$ 34.305,07" apareçam inteiros em vez de cortados com "…"

5. **Cards secundários** — Reduzir font de `text-sm` para `text-xs` no mobile (manter `md:text-base`) para que Impressões/Cliques/Pedidos/CTR caibam sem corte

### Resultado esperado
Todos os valores numéricos visíveis sem corte no viewport 390px, mantendo o layout 2x2 (KPIs) e 4-col (secundários).

