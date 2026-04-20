

## Diagnóstico (image-268, image-269)

O card "**Descobrir produtos vencedores**" no topo da pesquisa de tendências está com problemas claros:

1. **Ícone com gradient laranja gigante (44px)** dentro de caixa arredondada — visual de "banner promocional" de e-commerce, não de ferramenta SaaS profissional
2. **Badge "FERRAMENTA"** em pílula laranja contrastante — redundante e ruidoso (já está em destaque com border primary)
3. **Borda laranja contínua + gradient laranja sutil de fundo** — compete visualmente com os botões "Importar Shopee" e "Análise" (também laranja), poluindo a hierarquia
4. **Copy genérica**: "Descobrir produtos vencedores / Pesquise demanda, sazonalidade e concorrência" — abstrato, não comunica valor concreto
5. **Card flutuando isolado** entre charts e Ranking — não tem conexão visual com o que vem antes/depois

## Referências modernas (Linear, Vercel, Notion AI, Stripe Sigma)

Padrão SaaS premium pra "ferramenta destacada":
- **Borda neutra** + **acento sutil só no ícone** (não no card inteiro)
- **Ícone pequeno e geométrico** (16-20px), não emoji-grande
- **Tipografia hierárquica forte** (título + métrica/preview de funcionalidade ao lado)
- **CTA explícito à direita** ("Pesquisar →") em vez de chevron sozinho
- **Preview do que faz** (chips com features: "demanda · sazonalidade · regiões")
- **Sem badges de "FERRAMENTA"** — quem é dev/PM já entende pelo contexto

## Plano de redesign

### Novo card (estado fechado)

```
┌────────────────────────────────────────────────────────────────┐
│ [✨] Pesquisa de mercado          [demanda] [sazonal] [região] │
│      Descubra se um produto vale a pena antes  ┃               │
│      de cadastrar na sua loja                  ┃   Pesquisar → │
└────────────────────────────────────────────────────────────────┘
```

**Mudanças visuais**:
- **Borda neutra** `border-border` (não primary). Só hover ganha `border-primary/40`
- **Background**: `bg-card` puro (sem gradient laranja). No hover, `bg-card-hover`
- **Ícone**: Search ou Sparkles em **32px** dentro de caixa **40px** com `bg-primary/10 border-primary/20` (sutil, não gradient)
- **Título**: "Pesquisa de mercado" (mais direto que "Descobrir produtos vencedores")
- **Subtítulo**: "Descubra se um produto vale a pena antes de cadastrar na sua loja" (concreto, fala do **uso**)
- **Chips de features** (ao invés de badge "FERRAMENTA"): 3 chips pequenos `text-[10px]` com bg-surface-2 — "Demanda 12m", "Sazonalidade", "Regiões". Mostram o que a ferramenta entrega
- **CTA à direita**: botão `text-primary` "Pesquisar →" com hover. Mais convidativo que chevron solto. No mobile, vira só chevron.
- **Remover badge "FERRAMENTA"** completamente

### Estado aberto

- Mesmo card, mas com **divisória sutil** entre header e conteúdo
- Header continua visível como contexto, **sem repetir** o subtítulo/chips quando aberto (compacta pra `py-3`)
- Chevron rotaciona, CTA "Pesquisar →" some (já está pesquisando)
- Conteúdo do `TrendSearchCard` herda o card pai (continua com `hideOuterBorder hideHeader`)

### Conexão visual com o resto

- Adicionar **header de seção** acima do card, igual "Saúde da carteira":
  ```
  🔍 Pesquisa de mercado
  Avalie o potencial de qualquer produto antes de cadastrar
  ```
- Isso ancora o card no fluxo da página em vez de ser uma "ilha" laranja flutuante

### Polimentos extras

- **Padding**: card interno `p-3.5` → `px-4 py-3` (mais arejado horizontal, menos altura)
- **Border-radius**: `rounded-xl` → `rounded-2xl` pra alinhar com o estilo dos outros surface-cards
- **Animação**: `transition-all duration-200` no hover (border + bg)

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | Redesign completo do bloco Collapsible "Descobrir produtos vencedores": (1) Adicionar header de seção "Pesquisa de mercado" igual aos outros; (2) Card com border neutra + hover primary, sem gradient laranja; (3) Ícone menor em caixa sutil; (4) Substituir badge "FERRAMENTA" por 3 chips de features (Demanda/Sazonalidade/Regiões); (5) CTA "Pesquisar →" à direita; (6) Estado aberto compactado sem repetir subtítulo |

Sem mudanças em `AnalyticsCharts.tsx`, `TrendSearchCard.tsx`, ou backend.

## Trade-offs

- ✅ Card agora parece **ferramenta SaaS profissional**, não banner promo
- ✅ Hierarquia clara: laranja fica reservado pros CTAs reais (Análise tab, Novo Produto), card neutro com acento sutil
- ✅ Chips de features comunicam o que a ferramenta **entrega** sem precisar abrir
- ✅ Header de seção dá contexto e simetria com "Saúde da carteira"
- ⚠️ Card menos chamativo que antes — mitigado pelo CTA "Pesquisar →" + chips que sinalizam funcionalidade
- ⚠️ Ainda fica aberto por padrão (mantém preferência anterior)

