

## Plano: Sistema de Variações por Atributos (Estilo ERP/Marketplace)

### O que muda

Atualmente as variações são uma lista simples com nome livre. Vamos transformar em um sistema de **atributos + combinações automáticas**, como funciona na Shopee, Mercado Livre e ERPs.

---

### 1. Novo modelo de dados (types/store.ts)

Substituir `ProductVariation` por um sistema de atributos:

```text
ProductAttribute {
  id: string
  name: string          // "Tamanho", "Cor", "Material"
  values: string[]      // ["P", "M", "G", "GG"]
}

ProductVariation {
  id: string
  attributes: Record<string, string>  // { "Tamanho": "P", "Cor": "Preto" }
  sku?: string
  costPrice: number
  salePrice: number
  stockQuantity: number
}

Product {
  ...campos atuais
  attributes: ProductAttribute[]      // NOVO
  variations: ProductVariation[]      // combinações geradas
  stockQuantity → calculado (soma das variações se hasVariations)
}
```

O campo `variations` no banco (JSONB) já suporta essa estrutura sem migração de schema.

---

### 2. Formulário de produto (ProductForm.tsx)

Substituir a seção de variações atual por:

**Seção "Atributos"** (toggle ativar/desativar):
- Botão "Adicionar Atributo" (ex: Tamanho, Cor)
- Para cada atributo: campo nome + campo de valores separados por vírgula ou chips
- Sugestões rápidas: Tamanho (P, M, G, GG, XG), Cor (Preto, Branco, Azul, Vermelho)
- Ao adicionar/remover valores, **gerar combinações automaticamente**

**Tabela de combinações geradas:**
- Cada linha = uma combinação (ex: P/Preto, P/Branco, M/Preto...)
- Colunas: Combinação | SKU (opcional) | Custo | Venda | Estoque
- Botão "Aplicar preço para todas" para preencher custo/venda em lote
- Botão para remover combinações específicas

**Estoque total** = soma automática dos estoques das variações (sem campo manual).

---

### 3. Página de Estoque (Stock.tsx)

Reformular para:
- Ao expandir um produto com variações, mostrar **cada combinação** com controle individual +/- de estoque
- Estoque total do produto = soma das variações (exibido no card principal)
- Filtro de estoque baixo/zerado considera variações individuais
- Valor total em estoque considera custo × quantidade de cada variação
- Busca funciona por nome do produto e nome das variações

---

### 4. StoreContext.tsx

- `addProduct` / `updateProduct`: salvar `attributes` e `variations` no campo JSONB existente
- `stockQuantity` do produto: quando `hasVariations`, calcular como soma das variações ao carregar
- Manter compatibilidade com produtos sem variações (funcionam igual)

---

### 5. Sem migração de banco

O campo `variations JSONB` na tabela `products` já existe e aceita qualquer estrutura. A nova estrutura com `attributes` será armazenada dentro do JSONB existente, sem precisar alterar o schema.

Será adicionado um campo `attributes` apenas no tipo TypeScript local, e serializado junto ao produto no JSONB `variations` ou em um novo campo JSONB no mesmo update.

**Migração necessária:** Adicionar coluna `attributes JSONB DEFAULT '[]'` na tabela `products` para separar atributos das variações.

---

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/types/store.ts` | Novo tipo `ProductAttribute`, atualizar `ProductVariation` e `Product` |
| `src/components/forms/ProductForm.tsx` | Nova seção de atributos com geração automática de combinações |
| `src/pages/Stock.tsx` | Expandir variações com controle individual, estoque = soma |
| `src/contexts/StoreContext.tsx` | Mapear `attributes`, calcular `stockQuantity` como soma |
| **Migração SQL** | `ALTER TABLE products ADD COLUMN attributes JSONB DEFAULT '[]'` |

