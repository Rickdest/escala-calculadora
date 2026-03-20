

## Plano: Simplificar aba ROAS

Após analisar o código, a aba ROAS tem **informação triplicada** em vários pontos. Aqui está o que é redundante e a proposta de limpeza:

### Problemas Identificados

1. **Gauge radial + Barra de progresso ROAS** → Ambos mostram a posição do ROAS nas zonas. Redundante.
2. **Health Banner + Diagnostic Banner** → Dois banners consecutivos com mensagens quase idênticas sobre o status do produto.
3. **Donut de composição + Detalhamento Financeiro** → Ambos mostram preço, taxa Shopee, custo e lucro. A tabela repete o donut.
4. **3 KPI cards (Empate/Médio/Lucrativo)** → Já aparecem como labels na barra de progresso. Informação duplicada.
5. **Botão Share** → Ocupa espaço, raramente usado.
6. **Seção de importação CSV** dentro da aba ROAS → Já existe na aba Shopee Ads. Duplicado.

### Proposta de Layout Simplificado

**Arquivo: `src/components/charts/RoasAnalysis.tsx`**

Após selecionar produto e preencher ads, mostrar apenas:

1. **Health Banner** — mantém (diagnóstico visual rápido)
2. **3 KPI cards** — mantém mas compactar (Empate / Médio / Lucrativo em linha)
3. **Barra de progresso ROAS** — mantém (visualização principal)
4. **Donut de composição** — mantém (visual útil)
5. **2 cards Lucro + Taxa** — mantém (compacto e útil)

**Remover:**
- Gauge radial (RoasGauge) — ~30 linhas
- Diagnostic Banner — ~30 linhas (Health Banner já cobre)
- Detalhamento Financeiro — ~25 linhas (donut já cobre)
- Botão Share — ~10 linhas
- ProductAdsImport na aba ROAS — ~110 linhas (já existe na aba Shopee Ads)

**Resultado:** ~200 linhas removidas. O scroll no mobile reduz ~60%. A informação essencial permanece sem repetição.

### Detalhes Técnicos

- Remover componente `RoasGauge` e sua invocação (linhas 125-155, 657-666)
- Remover bloco Diagnostic Banner (linhas 620-652)
- Remover bloco Financial Detail (linhas 728-750)
- Remover `ShareResult` import e uso (linhas 716-726)
- Remover `ProductAdsImport` invocação da aba ROAS (linhas 772-776) — mantém o componente pois pode ser usado em outro lugar
- Ajustar grid: onde tinha `md:grid-cols-2` para gauge+donut, fica só o donut centralizado com `max-w-sm mx-auto`

Nenhuma funcionalidade, cálculo ou outra tela será alterada.

