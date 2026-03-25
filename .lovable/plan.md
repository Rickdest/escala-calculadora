

## Redesign dos Cards de Produto — Layout Moderno e Compacto

### Problemas Atuais
- Card muito vertical com espaçamento excessivo entre seções
- Botão "Importar Ads CSV" ocupa linha inteira desnecessariamente
- Badges de margem/lucro com estilo pesado (fundo colorido + borda)
- Métricas de Ads e canais centralizadas sem hierarquia visual clara
- Sem separação visual entre dados financeiros e dados de Ads

### Referência de Design
Inspirado em apps financeiros modernos (Shopee Seller Center, Nubank Business, apps de trading): cards compactos com **grid de métricas**, dados financeiros em **layout horizontal denso**, e hierarquia por tamanho de fonte em vez de badges coloridos.

### Novo Layout do Card

```text
┌─────────────────────────────────────────────┐
│ [IMG] Nome do Produto              [⋮ menu]│
│       R$ 35,00  ·  Custo R$ 16,00          │
│─────────────────────────────────────────────│
│  Margem          Lucro         [Importar ↗]│
│  22.9%           R$ 8,00                   │
│  ■■■■■■■□□□                                │
│─────────────────────────────────────────────│
│  Pos #14   ROAS 10.49   ACOS 9.5%   119 un│
│─────────────────────────────────────────────│
│  👑 Amazon 36.5%  Shein 26.7%  ML 24.7%   │
└─────────────────────────────────────────────┘
```

### Mudanças Específicas

#### 1. Header do Card (Row 1)
- Manter layout atual (imagem + nome + preços + menu)
- Preço e custo na mesma linha com separador `·`

#### 2. Métricas Financeiras (Row 2) — **Principal mudança**
- Layout em **grid de 2 colunas** com margem à esquerda e lucro à direita
- Margem: número grande (text-lg font-bold) com cor semântica, sem badge/pill
- Lucro: número grande com cor semântica
- Barra de progresso fina abaixo da margem (relativa à meta)
- Botão "Importar Ads" reduzido para ícone pequeno no canto superior direito desta seção, só aparece se não tem ads

#### 3. Métricas de Ads (Row 3) — **Compacta**
- Linha horizontal única com métricas separadas por espaço
- Texto menor (text-[11px]), sem fundo em cada chip — usar separadores visuais sutis
- Posição com dot colorido em vez de emoji

#### 4. Canais (Row 4) — **Inline**
- Manter chips mas com estilo mais flat (sem borda, só fundo sutil)

### Arquivo modificado
- `src/components/cards/ProductCard.tsx` — redesign completo do layout interno

