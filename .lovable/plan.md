

## Drawer de produto — Tela única (sem abas, sem página de edição)

### Mudança principal
Eliminar as 3 abas e a página `/products/:id/edit`. Tudo fica em um único scroll contínuo dentro do drawer, com o formulário de edição inline (borda laranja) entre as métricas e o breakdown.

### Estrutura do scroll (de cima para baixo)

```text
┌─ Header (thumb + nome + preço + ✕)
│  Badge de status (✓ Lucrativo)
├─ Métricas (3 cards: Lucro/un · Margem · vs Meta)
├─ ✏ Editar produto (borda laranja esquerda, fundo laranja 3%)
│    Nome · Custo|Venda · Embalagem
│    Preview live (card verde: Lucro · Margem · ROAS emp.)
├─ Breakdown de Custos
├─ ROAS de Referência
├─ Margem por Canal (grid 2x2)
├─ Projeção Mensal (slider + grid 2x2 + status)
└─ Footer fixo: [🗑] [↗] [💾 Salvar alterações]
```

### Arquivos modificados

**1. `src/components/ProductDetailDrawer.tsx`** — Reescrever o conteúdo:
- Remover estado `tab` e as 3 abas (Resumo/Projeção/Canais)
- Remover barra de tabs do header
- Adicionar estado de edição: `editName`, `editCost`, `editSale`, `editPkg`
- Calcular `editCalc` em tempo real com `calculateProduct` para o preview live
- Layout do scroll: métricas → seção edição (borda laranja) → breakdown → ROAS → canais → projeção, tudo sequencial
- Seção de edição: `border-l-[3px] border-primary bg-primary/[0.03]`, com label "✏ EDITAR PRODUTO" em laranja uppercase
- Preview bar verde dentro da seção de edição: lucro/un, margem, ROAS empate
- Footer: botão 🗑 (delete), botão ↗ (share), botão 💾 "Salvar alterações" (verde/success), chama `onSave` com os dados editados

**2. `src/App.tsx`** — Remover rota `/products/:id/edit`

**3. `src/pages/ProductEdit.tsx`** — Deletar arquivo (não mais necessário)

**4. `src/pages/Products.tsx`** — Remover import de `ProductEdit` se houver referência

### Detalhes técnicos da seção de edição inline

```tsx
// Seção com borda laranja
<div className="border-t border-border border-l-[3px] border-l-primary bg-primary/[0.03] px-4 py-3.5">
  <p className="text-micro uppercase text-primary mb-3 flex items-center gap-1.5">
    <Pencil className="w-3 h-3" /> Editar produto
  </p>
  {/* campos: nome, custo|venda (2 cols), embalagem */}
  {/* preview bar verde com lucro, margem, ROAS empate do editCalc */}
</div>
```

### Footer
- Botão salvar: `bg-success text-white` (verde) sempre visível
- Chama `onSave({ name: editName, costPrice, salePrice, packagingCost })`
- Toast de sucesso + fecha drawer

### Resultado
Uma única tela scrollável com tudo visível. O usuário edita inline e vê o preview atualizar em tempo real, sem trocar de tela.

