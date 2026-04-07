

## Plano: Corrigir margem e meta ROAS incorretas nos Ads

### Diagnóstico

Em `AdsTab.tsx` (linhas 267-280), ao montar dados de campanhas da API, a margem e o ROAS de empate são calculados com uma **fórmula simplificada**:

```ts
const margin = (salePrice - costPrice) / salePrice;
roasEmpate = 1 / margin;
```

Essa fórmula ignora **todos os custos operacionais**: taxa Shopee (14-20%), impostos, embalagem, comissão de afiliado, Acelera, etc. Resultado:
- **Margem inflada** (ex: 1214% ao invés de ~12%)
- **ROAS empate muito baixo** (ex: 1.0 ao invés de ~8)
- **Meta ROAS errada** (1.1 ao invés de ~9)
- **Classificação incorreta** (tudo aparece como "Lucrativo")

A função `calcularRoasEmpate` em `adsLogic.ts` já faz o cálculo correto usando `calcFullRoas` com todos os custos. Ela só não está sendo usada nesse trecho.

### Correção

#### `src/components/roas/AdsTab.tsx` (linhas 267-280)

Substituir o cálculo simplificado por `calcularRoasEmpate(product, config)`:

1. Importar `calcularRoasEmpate` de `@/lib/adsLogic`
2. Obter `currentStore.config` (já disponível via `useStore`)
3. Trocar o bloco de cálculo manual pelo resultado de `calcularRoasEmpate(matchedProduct, currentStore.config)`

**Antes:**
```ts
const margin = salePrice > 0 ? ((salePrice - costPrice) / salePrice) : 0;
margemContribuicao = margin * 100;
roasEmpate = margin > 0 ? (1 / margin) : null;
```

**Depois:**
```ts
const empResult = calcularRoasEmpate(matchedProduct as Product, currentStore.config);
margemContribuicao = empResult.margemContribuicao;
roasEmpate = empResult.roasEmpate !== Infinity ? empResult.roasEmpate : null;
```

A classificação subsequente (linhas 274-279) continua funcionando com o `roasEmpate` correto.

### Arquivo modificado
- `src/components/roas/AdsTab.tsx`

### Resultado esperado
- Margem exibida reflete custos reais (Shopee, impostos, embalagem, etc.)
- Meta de ROAS condiz com a realidade operacional
- Classificação dos anúncios fica correta

