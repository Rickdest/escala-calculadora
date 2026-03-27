

## Adicionar botão "Atualizar CSV" + melhorar marcações no gráfico

### Problema
1. Após importar o log, não há botão para atualizar/reimportar — o usuário fica preso
2. As marcações no gráfico não estão aparecendo corretamente por dia

### Mudanças em `src/components/roas/AdsDetailFullView.tsx` — `OperationLogTimeline`

**1. Botão "Atualizar" quando já tem dados (linhas ~194-197)**

Adicionar no header (ao lado de "Histórico de Ajustes") um botão compacto "Atualizar CSV" com ícone `Upload`. Manter o `<input type="file">` já existente e reutilizar `handleImportLog`. Layout: `flex items-center justify-between` no header.

**2. Corrigir marcações no gráfico — usar data completa como chave**

O problema atual: eventos no mesmo dia geram o mesmo `dateLabel` (ex: "03/18"), causando sobreposição e confusão. Corrigir:

- Usar `fullDate` (timestamp completo) como `dataKey` do eixo X, mas formatar o tick para mostrar só "dd/MM"
- Garantir que cada evento tenha um ponto único no eixo X
- As `ReferenceLine` verticais usam o `fullDate` como `x` (não o dateLabel truncado)
- Cada tipo de evento (roas_target, budget, quick_boost, campaign_created) gera uma linha vertical tracejada com cor e label curto
- Agrupar eventos do mesmo dia com labels empilhados (se necessário, concatenar: "ROAS 14 · Orç R$30")

**3. Melhorar visibilidade das marcações**

- Aumentar `strokeWidth` das ReferenceLine para 1.5
- Labels com fundo semi-transparente para não sobrepor a linha do gráfico
- Se não tem pontos ROAS suficientes para o chart (< 2), mostrar apenas a lista de eventos com um mini indicador visual por tipo

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx`

