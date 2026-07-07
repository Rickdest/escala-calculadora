## Objetivo

Adicionar uma seção nova **"Kits / Versões de venda"** no cadastro do produto, separada das variações de Tamanho/Cor. Cada versão tem nome, custo e preço próprios, e mostra a margem real calculada com as regras da loja (Shopee).

Exemplo de uso:
- Produto: "Pingente coração"
  - Versão "Só pingente" — custo R$ 8,00 / venda R$ 24,90 → margem X%
  - Versão "Pingente + corrente" — custo R$ 15,00 / venda R$ 39,90 → margem Y%
  - Versão "Kit 3 unidades" — custo R$ 22,00 / venda R$ 69,90 → margem Z%

---

## 1. Modelo de dados

Novo tipo em `src/types/store.ts`:

```ts
export interface PriceVariant {
  id: string;
  name: string;         // "Só pingente", "Kit 3un"
  costPrice: number;
  salePrice: number;
}
```

Adicionar em `Product`:
```ts
priceVariants?: PriceVariant[];
```

Persistência: nova coluna `price_variants jsonb` na tabela `products` (default `'[]'`). Mapear em `storeMappers.ts` (leitura + gravação).

## 2. UI no ProductForm

Nova seção colapsável **"Kits / Versões de venda"** logo abaixo de custo/preço principais, antes de "Variações (Tamanho/Cor)":

- Texto explicativo curto: "Use quando o mesmo produto é vendido em formatos diferentes (kit, combo, com/sem acessório)."
- Lista de linhas, cada uma com: `Nome` | `Custo R$` | `Venda R$` | badge de margem real (verde/amarelo/vermelho seguindo `desiredMargin` da loja) | botão remover.
- Botão "+ Adicionar versão".
- Fica opcional — vazio por padrão, não bloqueia salvar.

Cálculo da margem por linha: reutilizar `calculateProduct` passando um `Product` temporário com o custo/venda da versão, usando o mesmo `StoreConfig`.

## 3. Exibição no detalhe do produto

Em `ProductDetail.tsx`, se `priceVariants.length > 0`, adicionar bloco **"Versões de venda"** na aba principal com mini-cards mostrando: nome, preço, custo, lucro/un e margem % com a mesma paleta de status já usada.

## 4. Fora de escopo (podemos fazer em passos futuros)

- Embalagem/ads próprios por versão
- Estoque por versão
- Comparativo por marketplace (ML/Shein/TikTok/Amazon) por versão
- Escolher versão ao vincular anúncio da Shopee

Assim que essa base estiver validada, dá pra evoluir sem retrabalho.

---

## Arquivos afetados

- Migração: adicionar coluna `price_variants jsonb default '[]'::jsonb` em `products`
- `src/types/store.ts` — tipo `PriceVariant` + campo em `Product`
- `src/lib/storeMappers.ts` — mapear leitura/escrita
- `src/components/forms/ProductForm.tsx` — nova seção de UI + save
- `src/pages/ProductDetail.tsx` — bloco de exibição das versões
