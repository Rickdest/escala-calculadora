

## Implementar Análise de Performance com Excel Diário

Recurso novo na aba de detalhe do produto (AdsDetailFullView) que permite importar o Excel de performance diária do Shopee Analytics e cruzar com o operation log existente.

### Análise do Excel

O arquivo tem 5 planilhas:
- **Page 1**: "Performance do Produto" — dados diários (data, impressões, cliques, CTR, compradores, unidades, vendas BRL) + linha de totais no topo
- **Page 2**: "Pedido Feito" — fontes de tráfego (Pesquisar 79.58%, Recomendação 15.57%, Outros 4.59%, Afiliado)
- **Page 3**: "Produto Pago" — mesma estrutura de fontes mas para pedidos pagos
- **Page 5**: Etiquetas (ex: "Mudança de Preço" em 10/03)

Dados extras disponíveis: visitantes, taxa de rejeição, curtidas, adicionados ao carrinho — podem enriquecer a análise futura.

---

### Arquitetura

```text
src/lib/shopeeExcelParser.ts        ← Parser do XLSX (novo)
src/components/roas/ExcelAnalysis.tsx ← Componente de análise (novo)
src/components/roas/AdsDetailFullView.tsx ← Integração na tab "Métricas"
package.json                         ← Adicionar xlsx (SheetJS)
```

### Fase 1: Parser do Excel (`src/lib/shopeeExcelParser.ts`)

- Instalar `xlsx` (SheetJS) — parser XLSX client-side, sem backend
- Validar: arquivo .xlsx, max 5MB, planilha "Performance do Produto" existe
- Ler planilha 1: detectar headers na row 4 (ou buscar dinamicamente), extrair dados diários da row 5+
- Mapear colunas com flexibilidade: `Data`, `Impressões de Produto`, `Cliques Por Produto`, `CTR`, `Compradores (Pedidos pago)`, `Unidades (Pedido pago)`, `Vendas (Pedido pago) (BRL)`
- Ler planilha 2/3: extrair fontes de tráfego (Pesquisar, Recomendação, Outros, Afiliado) com % e BRL
- Calcular: `data_primeira_venda`, totais, médias
- Números BR (`.` como separador de milhar, `,` como decimal) — tratar com regex

Interface de saída:
```typescript
interface ExcelPerformanceData {
  dataRange: { inicio: string; fim: string };
  dadosDiarios: DailyMetric[];
  totalDias: number;
  dataPrimeiraVenda: string | null;
  totais: { impressoes: number; vendasBrl: number; compradores: number };
  fontes: TrafficSource[];
}
```

### Fase 2: Componente de Análise (`src/components/roas/ExcelAnalysis.tsx`)

4 seções renderizadas após upload:

**1. Antes vs Depois dos Ads**
- Dividir dados pela `dataPrimeiraVenda`
- Mostrar 2 cards lado a lado: período orgânico vs período com Ads
- Média de vendas/dia, total BRL, incremento

**2. Fontes de Tráfego**
- Barras horizontais com % e BRL por fonte
- Destacar fonte principal

**3. Correlação com Operation Log**
- Cruzar datas do operation log (já carregado no OperationLogTimeline) com dados diários do Excel
- Para cada mudança: mostrar métricas do dia anterior vs dia da mudança
- Delta de impressões e vendas com observação automática (positivo/negativo)

**4. Gráfico de Tendência**
- Recharts (já instalado) com dual Y-axis
- Linha azul: impressões diárias
- Linha verde: vendas/compradores diários
- ReferenceLines verticais para cada evento do operation log
- Labels nos markers com a mudança (ex: "ROAS 10→20")

### Fase 3: Integração no AdsDetailFullView

- Adicionar botão de upload de Excel na tab "Métricas & Histórico"
- Quando importado, renderizar `<ExcelAnalysis>` passando `excelData` e `operationLog`
- Armazenar dados parseados no estado local (sem persistir no banco por ora — o arquivo pode ser reimportado)
- Input aceita `.xlsx` com validação de segurança (tamanho, formato)

### Fase 4: Persistência (opcional, recomendado)

- Criar tabela `product_daily_performance` para guardar dados diários parseados
- Campos: `user_id`, `product_id`, `shopee_product_id`, `date`, `impressions`, `clicks`, `ctr`, `buyers`, `units`, `sales_brl`
- Isso permitirá comparação entre períodos futuros sem reimportar

### O que NÃO muda
- Nenhuma lógica de cálculo existente (adsLogic, shopeeAdsParser)
- CSV import (performance e operation log) — fluxo intacto
- OperationLogTimeline — componente intacto, apenas consumimos seus dados
- Aba ROAS, SummaryCards, FilterChips

### Dependência
- `xlsx` (SheetJS) — ~200KB gzipped, parser client-side sem backend

### Technical details

- SheetJS lê o ArrayBuffer do FileReader, acessa sheets por nome
- Números BR precisam de `parseFloat(str.replace(/\./g, '').replace(',', '.'))` 
- Datas podem vir como serial numbers do Excel ou strings DD/MM/YYYY — tratar ambos
- O operation log já está carregado no `OperationLogTimeline` — passar via callback ou estado compartilhado
- Gráfico usa `ComposedChart` do Recharts com `Line` + `ReferenceLine`

