

## Simplificar ProductCard — remover seção de Ads

### Arquivo: `src/components/cards/ProductCard.tsx`

**1. Remover imports e props de ads**
- Remover import de `getRoasColor` e `Upload`
- Remover props: `adsMetric`, `onImportAds`, `onAdsUpdate` da interface e destructuring

**2. Guard de margem absurda (linhas 188-193)**
- Se `realMargin > 200` ou `realMargin < -100`, mostrar "⚠ Revisar" em amarelo ao invés do número

**3. Label "Lucro" → "Lucro/un" (linha 199)**

**4. Remover bloco Ads inteiro (linhas 237-319)**
- Remove: seção ads com posição/ROAS/custo/un quando `adsMetric` existe
- Remove: botão "Importar relatório de Ads" quando não existe

**5. Footer permanece igual** (estoque + Ver detalhes)

### Resultado
Card mostra apenas: header → 3 métricas (margem, lucro/un, ROAS empate) → plataformas → footer (estoque + detalhes). Zero referência a ads.

