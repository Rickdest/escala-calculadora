

## Análise da página de detalhe do produto (rota `/products/:id`)

Olhando a screenshot e o `ProductDetail.tsx`, identifico os problemas e as melhorias:

### Problemas atuais

1. **Sobra enorme à direita** — o conteúdo usa `max-w-3xl` (768px) mas o viewport útil tem ~1500px → metade direita vazia
2. **Header empilhado/apertado** — "Produtos ← / imagem / nome / preço / Editar / Share / Lixeira" tudo numa linha só, espremido. O nome longo é truncado.
3. **Cards isolados em coluna única** — Breakdown, ROAS, Canais, Projeção, Estoque são todos `surface-card` empilhados verticalmente, deixando o lado direito vazio em desktop
4. **KPIs subutilizados** — só 3 números no topo (Lucro/un, Margem, vs Meta) num card largo, podia ter mais densidade
5. **Hierarquia visual fraca** — todos os cards têm o mesmo peso visual; nenhum "destaque" para o que importa mais (margem, ROAS)
6. **Estoque jogado no final** — informação importante (alerta de estoque baixo) fica perdida lá embaixo
7. **Botão "Compartilhar" e "Excluir"** ocupam espaço de header sendo pouco usados — deveriam estar num menu "..."

### Solução proposta — Layout em grid 2 colunas (desktop)

**Princípio Claude/Opus 4.7 Designer:** densidade informacional + hierarquia clara + espaço respirando, sem desperdiçar viewport.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ← Produtos                                                          │
│                                                                     │
│ ┌───┐  Calça Legging Feminina Canelada 3D Premium                  │
│ │img│  R$ 54,90 venda · custo R$ 24,00      [✓ Lucrativo +14%]    │
│ │64 │                                                               │
│ └───┘                              [Editar]  [⋯ menu: share/del]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──── HERO METRICS (col-span-2) ────────────────────────────────┐  │
│ │ R$ 15,92        29.0%         +14.0%        2.45x              │ │
│ │ Lucro/un        Margem real   vs Meta 15%   ROAS empate        │ │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌──── COLUNA ESQUERDA ─────┐  ┌──── COLUNA DIREITA ─────────────┐  │
│ │ 💰 Breakdown de Custos   │  │ 🎯 ROAS de Referência           │  │
│ │ • Custo produto  R$24,00 │  │ Empate ──────  2.45x            │  │
│ │ • Taxa Shopee    R$14,98 │  │ Saudável ─────  3.10x           │  │
│ │ • Embalagem        —     │  │ Ideal ────────  4.50x           │  │
│ │ • Impostos         —     │  │                                  │  │
│ │ • Afiliados        —     │  ├──────────────────────────────────┤  │
│ │ • Campanhas        —     │  │ 📊 Comparativo de Canais        │  │
│ │ • Acelera          —     │  │ [CTA preencher outros canais]   │  │
│ │ ────────────────────     │  │                                  │  │
│ │ Total       R$ 38,98     │  ├──────────────────────────────────┤  │
│ └──────────────────────────┘  │ 📦 Estoque                       │  │
│                               │ 0 unidades  ⚠ abaixo do mínimo  │  │
│ ┌──── PROJEÇÃO MENSAL (col-span-2) ────────────────────────────┐  │
│ │ Slider 50 vendas/mês                                          │ │
│ │ Receita R$2.745  | Custos R$1.949 | Lucro R$796 | 29%        │ │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Mudanças concretas em `src/pages/ProductDetail.tsx`

**1. Container principal**
- `max-w-3xl` → `max-w-6xl mx-auto` (usa toda a largura útil sem grudar nas bordas)
- Padding: `px-4 md:px-8`

**2. Header reorganizado em 2 linhas**
- Linha 1: Breadcrumb "← Produtos" sozinho, pequeno
- Linha 2: Imagem 64×64 + título grande + meta info + badge de status à direita + botões "Editar" e menu "⋯" (compartilhar/excluir colapsados num dropdown)
- Status badge (Lucrativo/Atenção/Prejuízo) sobe pro header em vez de ficar solto

**3. Hero Metrics (faixa com 4 KPIs)**
- Grid 4 colunas em desktop, 2×2 em mobile
- Adicionar **ROAS de empate** como 4º KPI (hoje só tem 3) — informação crítica que merece destaque
- Cards individuais com border sutil, em vez de um card só

**4. Layout em grid 2 colunas (md:)**
```tsx
<div className="grid md:grid-cols-2 gap-5">
  <div>Breakdown</div>
  <div className="space-y-5">
    <ROAS />
    <Canais />
    <Estoque />
  </div>
</div>
```
- Em mobile: tudo em coluna única (mantém comportamento atual)
- Em desktop: Breakdown ocupa coluna esquerda inteira (é longo, 7 itens), coluna direita empilha ROAS + Canais + Estoque

**5. Projeção Mensal full-width abaixo**
- Como é interativa (slider) e tem 4 KPIs em grid, fica melhor sozinha embaixo ocupando todo o width

**6. Menu "⋯" para ações secundárias**
- Substituir botões soltos de Compartilhar e Excluir por um `DropdownMenu` (já existe em `components/ui/dropdown-menu.tsx`) com ícone "MoreVertical"
- Itens: Compartilhar, Excluir (em vermelho)
- Libera espaço no header para o título respirar

**7. Card de Estoque com mais peso visual**
- Quando estoque ≤ mínimo: borda amarela + badge "⚠ Reposição"
- Botão "Ajustar estoque" → abre o ProductForm direto na seção de estoque (futuro)

### Arquivos modificados
- `src/pages/ProductDetail.tsx` — único arquivo (apenas layout/className + adição de DropdownMenu para ações secundárias)

### Sem mudanças
- `ProductForm` (modal de edição) — fluxo mantido como você pediu
- `ProductDetailDrawer` — não usado nesta rota
- Lógica de cálculo, ROAS, canais — tudo intacto
- Tokens de design — mesma paleta

### Resultado
- Aproveita toda a largura do desktop (878px CSS no viewport atual → cabe bem no `max-w-6xl`)
- Hero metrics dão destaque imediato aos números que importam
- Grid 2 colunas elimina a "torre vertical" e o vazio à direita
- Header limpo com ações secundárias agrupadas no menu

