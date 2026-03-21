

## Plano: Aplicar layout de Produtos no Estoque

Alinhar a página Estoque com o mesmo padrão visual da página Produtos: header com PageHeader, FAB flutuante, remover botão do header, mesmo padding e espaçamento.

### Mudanças — `src/pages/Stock.tsx`

1. **Remover botão "Novo Produto" do header** — substituir o header manual por `<PageHeader title="Estoque" />`

2. **Adicionar FAB flutuante** — mesmo estilo da página Produtos:
   - Círculo 56×56px laranja `#F97316` no mobile
   - Retangular com texto "Novo Produto" no desktop (≥768px)
   - `bottom: calc(96px + env(safe-area-inset-bottom))`, `right: 20px`
   - `z-50`, `shadow-lg`, `active:scale-95`

3. **Ajustar padding do conteúdo** — mudar de `px-4` para `px-3` e adicionar `md:px-0 md:max-w-[800px]` para consistência com Produtos

4. **Substituir emojis de status** por bolinhas coloridas (dots) como na lista de Produtos: `w-2 h-2 rounded-full bg-success/bg-warning/bg-destructive`

5. **Simplificar item da lista** — alinhar com o padrão de Produtos: nome + subtexto à esquerda, status dot + quantidade à direita + ChevronRight

Nenhuma funcionalidade, cálculo ou outra tela será alterada.

