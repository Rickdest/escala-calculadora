

## Aplicar grid responsivo na lista de produtos da aba Ads

### Arquivo: `src/components/roas/AdsTab.tsx`

### Mudança (linhas 262-278)

Trocar o container `<div className="space-y-3">` da lista de `AdsProductCard` por um grid responsivo igual ao da aba Produtos:

- Mobile: 1 coluna (`grid-cols-1`)
- Desktop: 2 colunas (`md:grid-cols-2`)
- Gap consistente (`gap-3`)

```text
Antes:  <div className="space-y-3">
Depois: <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

Nenhuma outra alteração necessária — o `AdsProductCard` já é flex/block e se adapta à largura disponível.

