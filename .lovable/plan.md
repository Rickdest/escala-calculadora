

## Redesign do Resultado da Calculadora Rapida — Hero Compacto + Pills

### Problema atual
O resultado ocupa muito espaco vertical com blocos separados por bordas, criando um visual pesado e "boxy". O card com grid de 2 colunas para Margem/ROAS Empate parece rigido e desperdicado.

### Nova abordagem: Hero compacto + pills

```text
┌─────────────────────────────────┐
│                                 │
│      LUCRO POR VENDA            │
│      R$ 9,92                    │  ← Hero grande, centralizado
│                                 │
│  ┌──────────┐  ┌──────────────┐ │
│  │ 33.2%    │  │ ROAS 3.01    │ │  ← Pills horizontais
│  │ margem   │  │ empate       │ │
│  └──────────┘  └──────────────┘ │
│                                 │
│  ⚠️ Taxas nao configuradas     │  ← Aviso inline (se aplicavel)
│                                 │
│  ↓ Analise  ·  💾 Salvar       │  ← Acoes
└─────────────────────────────────┘
```

### Mudancas no arquivo `src/components/home/QuickCalculator.tsx`

**Substituir blocos 1-4 do resultado (linhas 189-250) por:**

1. **Hero do Lucro** — Remover bordas ao redor. Usar padding generoso (py-6), valor 36px (reduzir de 42px para caber melhor), centralizado. Sem borda inferior.

2. **Pills de Margem e ROAS** — Em vez de grid com bordas, usar dois "pills" lado a lado:
   - Fundo `bg-surface-2`, border-radius 10px, padding 10px 16px
   - Cada pill mostra valor + label embaixo
   - Margem: valor colorido (verde/amarelo/vermelho) + label "margem" em text-3
   - ROAS: valor amarelo + label "roas empate" em text-3
   - Gap de 8px entre pills, centralizados com `flex gap-2 justify-center`

3. **Aviso de taxas** — Inline discreto sem bordas, apenas texto com link

4. **Acoes** — Linha simples sem borda superior, mesmo estilo atual

### O que NAO muda
- Logica de calculo (useMemo, result, projection)
- Secao de analise completa (linhas 253-393)
- Inputs e botao calcular
- CostRow component
- Funcionalidade de salvar produto

### Detalhes tecnicos
- Arquivo unico: `src/components/home/QuickCalculator.tsx`
- Apenas as linhas 189-250 (bloco de resultado) serao reescritas
- Manter todas as classes de animacao (`animate-fade-up`)
- Pills usam `bg-surface-2 rounded-[10px] px-4 py-2.5 flex-1 text-center`
- Valor do lucro: `font-mono text-[36px] font-bold`
- Valores nos pills: `font-mono text-[20px] font-bold`
- Labels nos pills: `text-[10px] uppercase text-text-3 mt-1`

