

## Plano: Mostrar posição nos cards da lista e ordenar por GMV

### Bug 1 — Posição não aparece nos cards

**Causa**: Linha 309 de `AdsTab.tsx` hardcoda `posicao_importada: false` para campanhas da API. O `AdsProductCard` só mostra posição quando `posicao_importada === true && posicao_media > 0`.

**Correção**: Mudar linha 308-309 para:
```typescript
posicao_media: campaign.avg_position,
posicao_importada: campaign.avg_position !== null && campaign.avg_position > 0,
```

### Bug 2 — Lista não ordenada por GMV

**Causa**: `filteredMerged` (linha 457-469) aplica filtros mas não ordena. A ordenação por GMV só existe no `filtered` (CSV puro, linha 429), que é ignorado quando há dados de API.

**Correção**: Adicionar `.sort()` ao final de `filteredMerged`:
```typescript
return result.sort((a, b) => (b.ad.gmv || 0) - (a.ad.gmv || 0));
```

### Arquivo modificado
- `src/components/roas/AdsTab.tsx` — 2 alterações pontuais

