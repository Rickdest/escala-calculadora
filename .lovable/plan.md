

## Plano: Fix expand visual + formatar campaign_created em pills

### Problema 1: Clique não mostra visualmente que está selecionado/expandido
O `ResultadoCard` no `ExcelAnalysis.tsx` expande o texto mas não tem feedback visual. O card precisa de um indicador claro de estado expandido.

### Problema 2: campaign_created mostra texto enorme ilegível
O `entry.details` de `campaign_created` vem como string longa ("Create Campaign: Status do Anúncio: Em Andamento Orçamento total: Ilimitado..."). Isso aparece tanto no `AdsDetailFullView.tsx` (Impacto das Mudanças) quanto no `ExcelAnalysis.tsx` (Resultado Após Cada Mudança).

### Solução

**Arquivo 1: `src/components/roas/AdsDetailFullView.tsx`**

1. Criar função `parseCampaignDetails(details: string)` que extrai key-values da string longa e retorna array de `{label, value}` (ex: "R$ 10.00/dia", "ROAS 0.0", "Impulsão: ON", etc.)
2. No `.map` de `displayEvents` (linha ~394), quando `entry.field === 'campaign_created'`, renderizar pills em `flex-wrap` ao invés do `<p>` com texto completo
3. Manter o `formatLogLabel` existente como título principal ("Campanha criada · ROAS 0.0")

**Arquivo 2: `src/components/roas/ExcelAnalysis.tsx`**

1. No `ResultadoCard`, adicionar borda mais visível quando expandido (ex: `border-primary/50` ou aumentar opacidade da borda)
2. Aplicar mesma lógica de `parseCampaignDetails` quando `c.mudanca` contém "CAMPAIGN CREATED" — mostrar pills ao invés de texto longo
3. Garantir que o chevron rotaciona e o card muda de estilo ao expandir

### Função parseCampaignDetails

Extrai da string campos como:
- Orçamento diário → "R$ 10.00/dia"
- ROAS de destino → "ROAS 0.0"
- Impulsão Rápida → "Impulsão: ON/OFF"
- Criativo do Produto → "Criativo: ON/OFF"
- Preço de lance otimizado → "Lance Otimizado: ON/OFF"
- Tipo de Venda → "Foco: Vendas"

### Detalhes técnicos
- `parseCampaignDetails` usa regex/split para extrair pares do texto bruto
- Pills: `text-[9px] px-1.5 py-0.5 rounded bg-surface-2 text-text-2`
- Expand visual: borda do card fica mais intensa + leve scale ou shadow

