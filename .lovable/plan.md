

## Plano: Melhorar visibilidade dos botões + KPIs combinados (Excel + Ads)

### Problemas identificados

1. **Botões apagados**: O botão de lixeira usa `variant="ghost"` com `text-muted-foreground`, "Sincronizar Ads" usa `variant="outline"` discreto, e "Importar Excel" usa classes `bg-muted/30` — tudo muito apagado no tema escuro.

2. **KPIs confusos**: Quando tem Excel + Ads, os KPIs mostram apenas `vendas_pago` (que é o valor do Excel). Falta contexto — o usuário não sabe se é orgânico, Ads, ou total. Precisa mostrar a composição clara.

### Mudanças

#### 1. Botões com mais destaque (`src/pages/Performance.tsx`)

- **Lixeira**: Trocar `variant="ghost"` por `variant="outline"` com ícone visível
- **Sincronizar Ads**: Usar cores mais vivas — `bg-primary/10 text-primary border-primary/30`
- **Importar Excel**: Usar estilo de botão outline real em vez de `div` com classes muted

#### 2. KPIs combinados quando tem Excel + Ads

Quando `hasExcelEnriched` (tem Excel e Ads juntos), mostrar 4 KPIs mais informativos:

| KPI | Valor | Sub |
|---|---|---|
| Receita Total | `vendas_pago` (do Excel = total) | `X dias` |
| Receita Ads | `ads_gmv` total | `Y% do total` |
| Gasto Ads | `ads_gasto` total | `ROAS Xz` |
| Produtos | contagem | `X com Ads / Y total` |

Isso deixa claro a composição orgânico vs ads nos KPIs de topo.

#### 3. Quando só tem Ads (sem Excel)

Manter os KPIs atuais de Ads (GMV Ads, Gasto, ROAS, Produtos) — já está bom.

### Arquivos modificados
- `src/pages/Performance.tsx` — estilo dos botões + KPIs combinados

