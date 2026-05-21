# Mini-prévia de margem nos canais externos

## Problema
Ao ativar Mercado Livre (ou TikTok/Shein/Amazon) no formulário de produto, o usuário preenche custo, venda, frete, embalagem… mas **não vê a margem calculada ali mesmo**. O único lugar que mostra é o "Comparativo de canais" lá embaixo, que fica longe e exige rolar. Resultado: parece que falta um campo de margem em cada canal.

## Solução
Adicionar um **bloco compacto de prévia** dentro de cada seção de canal (logo após os inputs), idêntico em estilo ao bloco "Prévia do Cálculo" da Shopee, mas em versão mini.

Cada bloco mostra, em tempo real:
- **Lucro líquido** (R$) — colorido conforme positivo/negativo
- **Margem real** (%) — colorido conforme meta (≥15% verde, 0–15% amarelo, <0 vermelho)
- **Linha resumo de custos**: comissão, taxa fixa (quando houver), frete, embalagem, impostos — em fonte pequena

## Onde aplicar
Dentro de `src/components/forms/ProductForm.tsx`, em **4 lugares** (um por canal), logo antes do fechamento de cada bloco `{outrosCanais.<canal> && (...)}`:
1. TikTok (~linha 393)
2. Shein (~linha 449)
3. Amazon (~linha 499)
4. Mercado Livre (~linha 555)

## Implementação técnica
- Reutilizar `calcOutrosCanais` de `src/lib/outrosCanaisUtils.ts` (já importado), que já retorna `{ netProfit, margin, ...detalhes }` por canal.
- Criar um pequeno componente local `ChannelMiniPreview` no próprio arquivo (ou em `src/components/forms/ChannelMiniPreview.tsx`) que recebe `{ netProfit, margin, breakdown }` e renderiza um card de 1 linha + 2 colunas (Lucro / Margem) seguindo os tokens (`text-success`, `text-warning`, `text-danger`, `surface-card`, `font-mono-num`).
- O cálculo já roda no `useMemo` existente que gera `channelComparison`. Basta extrair o `result` correspondente ao canal e passar.

## Estilo (seguindo design system)
```text
┌─────────────────────────────────────────┐
│ Prévia ML            [✓ Lucrativo]      │
│ Lucro: R$ X,XX        Margem: XX,X%     │
│ Comissão R$ X · Taxa fixa R$ X · Frete  │
└─────────────────────────────────────────┘
```
Cores via tokens semânticos (`text-success/warning/danger`, `bg-success/5`), padding `p-3`, fonte mono em valores.

## Fora de escopo
- Não alterar lógica de cálculo (`calcOutrosCanais` permanece igual).
- Não mexer no "Comparativo de canais" do fim do formulário (continua como visão consolidada).
- Sem mudança em tipos ou banco de dados.
