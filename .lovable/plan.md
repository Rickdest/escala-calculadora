

## Fix: Erro ao salvar CSV Geral — mapeamento de colunas errado

### Diagnóstico

O erro do banco é: `invalid input syntax for type integer: "9.27"`. O campo `impressoes_produto` (integer) está recebendo o valor de **ACOS Direto** (percentual como 9.27%) porque os índices de coluna estão errados em `detectGeneralColumnMap`.

Comparando o CSV real com o mapa atual:

**CSV com Palavra-chave (33 colunas):**
- Coluna 29 = "ACOS Direto" (percentual)
- Coluna 30 = "Impressões do Produto" (inteiro)
- Mapa atual diz `productImpressions: 29` — ERRADO, deveria ser 30

**CSV sem Palavra-chave (31 colunas):**
- Coluna 27 = "ACOS Direto" (percentual)
- Coluna 28 = "Impressões do Produto" (inteiro)
- Mapa atual diz `productImpressions: 27` — ERRADO, deveria ser 28

### Sobre os 2 arquivos CSV

Ambos são "formato geral" e funcionam. A diferença:
- **Dados Gerais** (sem palavra-chave): 31 colunas, mais limpo
- **Palavra-chave/Localização**: 33 colunas, tem detalhes de keyword

Ambos serão suportados. O sistema já agrega por produto, então o resultado final é o mesmo.

### Correção

**`src/lib/shopeeAdsParser.ts`** — Corrigir os 3 índices em ambos os mapas:

Formato com keyword (33 colunas):
```
productImpressions: 29 → 30
productClicks: 30 → 31
productCtr: 31 → 32
```

Formato sem keyword (31 colunas):
```
productImpressions: 27 → 28
productClicks: 28 → 29
productCtr: 29 → 30
```

### Arquivo alterado
- `src/lib/shopeeAdsParser.ts` — 6 números corrigidos em `detectGeneralColumnMap`

