

## Problema

Hoje o app tem **dois fluxos diferentes** ao clicar num produto:

| Viewport | Comportamento | Componente |
|---|---|---|
| **< 1024px** (mobile/tablet) | Abre bottom sheet "drawer" | `ProductDetailDrawer.tsx` (versão antiga, simplificada) |
| **≥ 1024px** (desktop) | Navega pra `/products/:id` | `ProductDetail.tsx` (versão nova, completa) |

O drawer mobile **não tem**:
- Aba Tendência (Google Trends, ciclo sazonal, regiões)
- KPI "ROAS Empate" (só tem 3 KPIs vs 4 no desktop)
- Layout em 2 colunas com Estoque destacado
- Estilo visual atual (KPIs grandes, breakdown com border-l colorido)

A imagem 247 (mobile/tablet em drawer) está visivelmente "mais antiga" que a 248 (desktop) — confirma o diagnóstico.

## Solução: unificar no `ProductDetail`

A página `ProductDetail.tsx` já é **totalmente responsiva** (usa `md:` em todos os breakpoints, tem CTA flutuante mobile-only no fim do arquivo, header adaptativo). Basta usá-la em **todos os tamanhos**.

### Mudança em `src/pages/Products.tsx` (linhas 283-289)

Trocar o `onCardClick` de:
```tsx
onCardClick={(p) => {
  if (window.innerWidth >= 1024) {
    navigate(`/products/${p.id}`);
  } else {
    setDetailProduct({ product: p, calc });
  }
}}
```
Para:
```tsx
onCardClick={(p) => navigate(`/products/${p.id}`)}
```

E remover:
- Estado `detailProduct` (linha 58)
- Renderização do `<ProductDetailDrawer />` no fim do arquivo
- Import do `ProductDetailDrawer` (linha 13)

### Manter `ProductDetailDrawer.tsx`?

**Deletar** o arquivo. Confirmado pelo grep: só é usado em `Products.tsx`. A versão de "performance" é outro arquivo (`src/components/performance/ProductDetailDrawer.tsx`) e fica intacta.

### Pequenos ajustes no `ProductDetail.tsx` para mobile ficar perfeito

Já está bom no geral, mas vou refinar:
1. **Espaçamento do breadcrumb**: hoje tem `py-4`, fica largo demais no mobile → ajustar pra `py-3 md:py-4`
2. **Tabs**: garantir que a TabsList ocupe largura total no mobile (`w-full grid grid-cols-2`) em vez de só `inline-flex`, pra ficar simétrica
3. **Hero KPIs**: já é `grid-cols-2 md:grid-cols-4` — ok, fica 2x2 no mobile como nas referências da imagem 248
4. **Coluna direita** (ROAS + Canais + Estoque): já vira stack vertical no mobile via `flex flex-col gap-5` — ok

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | Sempre navegar pra `/products/:id`; remover estado e render do drawer; remover import |
| `src/components/ProductDetailDrawer.tsx` | **Deletar** (não usado mais) |
| `src/pages/ProductDetail.tsx` | Refinos: tabs full-width no mobile, padding do breadcrumb |

### Resultado

- **Mobile**: clica no produto → abre página completa com Tabs Análise/Tendência, 4 KPIs (Lucro, Margem, vs Meta, ROAS Empate), breakdown, ROAS de referência, comparativo de canais, estoque, projeção mensal. CTA "Editar produto" flutuante já existe (botão laranja no fundo, conforme imagem 247).
- **Desktop**: idêntico ao que já é hoje.
- **Tablet**: usa o mesmo layout do mobile (até `md:`) ou desktop (a partir de `md: 768px`) — naturalmente adaptado.

### Trade-offs

- ✅ Um único fluxo, sem código duplicado, fácil de manter
- ✅ Mobile ganha aba Tendência + ROAS Empate + visual atualizado
- ✅ Voltar do detalhe é via "← Produtos" (breadcrumb), em vez de fechar drawer — comportamento padrão de PWA/web
- ⚠️ Quem clicava no card e via o detalhe "em cima" da lista agora navega pra outra rota; perde o gesto de "puxar pra baixo pra fechar". Aceito porque o ganho de paridade de features é maior

