

## Diagnóstico visual — Editar Produto sem respiro

Olhando a screenshot e o `ProductForm.tsx` (linha 212):

```tsx
<div className="fixed inset-0 ... md:inset-x-0 md:bottom-0 md:top-auto md:max-h-[92vh] md:rounded-t-2xl">
```

Em desktop (≥768px) o modal é uma "bottom sheet" que ocupa **100% da largura da tela** (`inset-x-0`), sem `max-width`. Isso explica o que você está vendo:
- Inputs gigantes esticando de ponta a ponta (preço de custo com 800px de largura)
- Imagem do produto sozinha no meio, isolada, com vazio enorme em volta
- Conteúdo cola nas bordas laterais (só tem `p-4` = 16px) → parece "sem margem"
- A largura horizontal mata a hierarquia: o olho não sabe onde focar

Em mobile o layout faz sentido (é uma sheet). Em desktop, fica feio porque sheet ≠ modal.

## Solução — redesenho no estilo Claude/Opus 4.7 Designer

Princípios aplicados:
1. **Container com largura máxima** em desktop (`max-w-3xl`, centralizado) — fim do "esticadão"
2. **Header sticky com hierarquia** — título + badge Shopee + close em linha equilibrada, com sub-info do produto (nome em itálico discreto)
3. **Hero da imagem reformulado** — imagem 96×96 alinhada à esquerda + bloco de identificação (nome do produto + chip "Shopee") ao lado, em vez de imagem solitária centralizada
4. **Seções em "cards" agrupados** — Identificação / Precificação / Embalagem viram um único card com divisores internos sutis (border-border/40), em vez de campos soltos com `space-y-4`
5. **Grid de precificação em 2 colunas com gap melhor** + labels com ícone `R$` integrado ao input (não como prefix bagunçado)
6. **Footer sticky com fundo blur** e botão alinhado à direita em desktop (não 100% width quando há espaço)
7. **Padding lateral responsivo**: `px-4 md:px-8` no conteúdo, `py-6 md:py-8`

### Mudanças concretas em `src/components/forms/ProductForm.tsx`

**Container (linha 211-212):**
```tsx
<div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
  <div className="bg-surface w-full md:max-w-3xl md:rounded-2xl border-t md:border border-border 
                  h-[100dvh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
```

**Header refinado (linhas 214-229):**
- Padding `px-5 md:px-8 py-4`
- Título à esquerda, badge Shopee como chip arredondado pill ao centro/direita, X num botão ghost circular
- Adicionar subtítulo discreto com nome do produto truncado quando em modo edição

**Hero — imagem + identidade (linhas 240-264 unificadas):**
- Em desktop: layout horizontal — imagem 96×96 à esquerda + à direita bloco com label "Nome do produto" e o input grande
- Em mobile: mantém vertical (imagem centralizada + nome embaixo)
- Substitui o "círculo flutuante no vácuo"

**Card de Precificação (linhas 266-306):**
- Envolver Custo + Venda + Embalagem num único `surface-card p-4 md:p-5 space-y-4`
- Título da seção: "Precificação" com ícone 💰
- Inputs com altura `h-11`, ícone `R$` num "addon" cinza colado à esquerda (estilo input-group), borda do input suaviza no foco com ring primary

**Conteúdo:**
- `px-5 md:px-8 py-5 md:py-6 space-y-5`

**Footer (linhas 735-739):**
- Fundo com `bg-surface/95 backdrop-blur` 
- Em desktop: dois botões alinhados à direita (Cancelar ghost + Salvar primary com ícone), `w-auto`
- Em mobile: botão full-width (mantém)

### Resultado visual esperado

Desktop:
```text
┌─────────────────────────────────────────────────┐
│  Editar Produto       [Importado Shopee]    [×] │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────┐  NOME DO PRODUTO *                    │
│  │ img  │  ┌────────────────────────────────┐   │
│  │ 96px │  │ Calça Legging Feminina...      │   │
│  └──────┘  └────────────────────────────────┘   │
│                                                  │
│  💰 Precificação                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Custo *           Venda * (Shopee)      │    │
│  │ [R$ 24,00]        [R$ 54,90 🔒]         │    │
│  │ ─────────────────────────────────────   │    │
│  │ Embalagem e insumos                     │    │
│  │ [R$ 0,00]                               │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  🌐 Outros canais        [opcional]      ▼     │
│                                                  │
├─────────────────────────────────────────────────┤
│                       [Cancelar] [💾 Salvar]    │
└─────────────────────────────────────────────────┘
```

### Arquivo único modificado
- `src/components/forms/ProductForm.tsx` — apenas estrutura/className do shell, header, hero e card de precificação. Toda a lógica (cálculos, estados, submit, outros canais, projeção) **fica intacta**.

### Sem mudanças em
- Tokens de design (continua usando `surface`, `surface-card`, `border-border`)
- Componentes Input/Button/Switch
- Lógica de cálculo, validação ou Supabase

