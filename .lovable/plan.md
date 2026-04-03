

## Plano: Persistir dados de Performance + Enriquecer layout

### Problema
1. **Dados não persistem**: os dados de performance ficam apenas em `useState` — ao sair e voltar, somem. Não há tabela no banco para salvar.
2. **Layout muito simples**: KPIs básicos, badges de status sem cor, ranking de produtos sem detalhes interativos. A imagem de referência mostra um layout rico com cards coloridos de KPI, chips de status coloridos, ranking clicável com painel lateral de variações.

### Solução

#### 1. Criar tabela `shopee_performance` no banco
- Colunas: `id`, `user_id`, `shop_id`, `summary` (jsonb), `product_sales` (jsonb), `synced_at`, `period_days`
- RLS: usuário só acessa seus dados
- O edge function `shopee-sync` salva/atualiza após agregação
- O frontend carrega do banco ao montar e exibe imediatamente (sem precisar clicar "Carregar")

#### 2. Atualizar `shopee-sync` para persistir
- Após calcular `order_performance`, fazer upsert na tabela `shopee_performance`
- Usar `ON CONFLICT (user_id, shop_id)` para atualizar dados existentes

#### 3. Enriquecer o layout (baseado na imagem de referência)

**KPI Cards** (3 colunas, estilo dashboard):
- Pedidos: número grande + "90 dias" como sub
- Faturamento: valor em verde + "R$ X/dia em média" como sub
- Ticket Médio: valor + "por pedido" como sub
- Bordas superiores coloridas (como nos cards do Ads)

**Pedidos por Status** (chips coloridos horizontais):
- Cada status com dot colorido (verde=Concluídos, vermelho=Cancelados, laranja=Pronto p/ envio, azul=Enviados, etc.)
- Layout inline horizontal com scroll

**Ranking de Produtos** (cards clicáveis):
- Cada produto: posição (#1, #2...), nome, ID do item, receita e unidades vendidas à direita
- Ao clicar, abre painel lateral (no desktop) ou drawer (no mobile) com:
  - Métricas do produto (unidades, receita, ticket médio, un/dia)
  - Todas as variações com destaque na mais vendida (★)
  - Participação no total (barras de % vendas e % receita)
  - Insight automático ("Variação X representa Y% das vendas")

**Botão "Atualizar dados"**: compacto no canto superior direito em vez de full-width

#### 4. Hook `usePerformanceData`
- Carrega dados do banco ao montar
- Expõe função `sync()` que chama `shopee-sync` e recarrega
- Mostra última sincronização ("Última sync hoje 18:00")

### Arquivos alterados

```
Migration SQL                              — criar tabela shopee_performance
supabase/functions/shopee-sync/index.ts    — upsert performance no banco
src/hooks/usePerformanceData.ts            — novo hook (load + sync)
src/pages/Performance.tsx                  — layout completo redesenhado
src/components/performance/ProductDetail.tsx — painel lateral de variações
```

### Resultado
Dados persistem entre sessões, carregam instantaneamente ao abrir, layout rico com chips coloridos, ranking interativo e insights de variações — conforme a imagem de referência.

