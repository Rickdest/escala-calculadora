

## Diagnóstico (prints 262-265)

A aba **Análise** hoje empilha numa única coluna larga, sem hierarquia clara:
1. 4 KPIs (Margem/Lucro/Na meta/Sem custo) — bom
2. Best/Worst em 2 cards separados — duplicação visual com KPIs
3. **Análise de demanda** (TrendSearchCard) ocupando ~30% da viewport quando expandido
4. 3 gráficos comprimidos lado a lado
5. Ranking longo

Resultado: usuário precisa rolar muito pra chegar no Ranking (informação operacional principal). A ferramenta de pesquisa de demanda compete com os dados da loja.

## Decisão sobre o card "Análise de demanda"

**Recomendação: tornar colapsável e mover pra baixo dos gráficos** (não no topo).

Razões:
- Topo deve ser **estado da loja** (KPIs + best/worst) — resposta imediata pra "como tá meu negócio?"
- TrendSearchCard é uma **ferramenta exploratória** (pesquisar produto que não tenho ainda) — uso esporádico
- Hoje sempre expandido = consome 600px de viewport sem o usuário pedir
- Solução: **card colapsável fechado por padrão**, com CTA chamativo "Pesquisar tendência de mercado →" que expande inline

Alternativa que descartei: deixar no topo. Polui o que importa (KPIs da loja) e força scroll pra dados operacionais.

## Plano de redesign

### 1. Nova ordem da aba Análise

```
┌─ Hero strip (1 linha) ──────────────────────────────┐
│ Margem · Lucro · Na meta · Sem custo  (4 KPIs)      │
└─────────────────────────────────────────────────────┘

┌─ Destaques (2 cards lado a lado) ───────────────────┐
│ 🏆 Melhor margem        ⚠️  Pior margem             │
└─────────────────────────────────────────────────────┘

┌─ Saúde da carteira (NOVA seção) ────────────────────┐
│ [Distribuição de margem]  [Top 5]  [Lucro/produto]  │
└─────────────────────────────────────────────────────┘

┌─ Análise de demanda (colapsável, fechado) ──────────┐
│ ✨ Pesquisar tendência de mercado            [+]    │
│    Descubra o potencial antes de cadastrar          │
└─────────────────────────────────────────────────────┘

┌─ Ranking de produtos ───────────────────────────────┐
│ [busca] [filtros]                                   │
│ #1 Produto ...                                      │
└─────────────────────────────────────────────────────┘
```

### 2. Polimentos visuais

**KPIs (linha 349-408)**
- Reduzir altura: `p-3` → `p-2.5`, valor `text-xl` → `text-lg` em mobile
- Remover `border-l-2` colorido (visual ruidoso quando 4 lado a lado) → manter só ícone colorido + barrinha de progresso fina embaixo (margem real / meta)
- Agrupar Best/Worst **dentro** do KPI "Margem" como mini-rodapé clicável → economiza 1 seção inteira

**Charts (linha 449-454)**
- Adicionar título da seção "Saúde da carteira" + descrição micro
- Cards com altura uniforme (`min-h-[240px]`) e padding consistente
- Em desktop: 3 col; em tablet: 1 col + 2 col; em mobile: stack

**TrendSearchCard (linha 447)**
- Renderizar dentro de um wrapper `<Collapsible>` (shadcn já existe) com:
  - Trigger: card 60px de altura com ícone Sparkles, título "Pesquisar tendência de mercado", subtítulo "Avalie demanda antes de cadastrar produto", chevron animado
  - Content: o `TrendSearchCard` atual (sem mexer)
- Default: fechado
- Persistir estado em `localStorage` (`products-trend-open`) pra usuários recorrentes que sempre usam

**Ranking (linha 457-624)**
- Já está bom, manter — só ajustar `md:max-w-[900px]` removendo o limite (deixar usar largura cheia em desktop pra alinhar com charts acima)

### 3. Ajuste no `TrendSearchCard` quando dentro do collapsible

Adicionar prop `hideOuterBorder?: boolean` — quando true, remove a borda lateral primária + reduz padding top, pra não duplicar o "card dentro de card" quando aninhado no Collapsible trigger.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | Reordenar aba Análise: KPIs compactos + Best/Worst em row (ou fundido em Margem) → charts com header "Saúde da carteira" → TrendSearchCard em Collapsible fechado → Ranking. Persistir abertura no localStorage |
| `src/components/products/TrendSearchCard.tsx` | Adicionar prop `hideOuterBorder?: boolean` pra evitar duplicação visual quando dentro de Collapsible |

Sem migrações. Sem mudança no backend. Sem mudança em outras telas (a aba "Tendência" do detalhe do produto continua usando `variant="embedded"` como já está).

## Trade-offs

- ✅ Topo limpo, foco em "estado da loja" (KPIs)
- ✅ Charts ganham respiro entre KPIs e Ranking
- ✅ TrendSearch acessível mas não invasivo (1 clique pra abrir)
- ✅ Ranking mais rápido de alcançar
- ⚠️ Usuário que SEMPRE usa pesquisa de tendência precisa de 1 clique extra → mitigado pelo localStorage
- ⚠️ `hideOuterBorder` cresce surface API do TrendSearchCard em +1 prop opcional

