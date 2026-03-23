

## Destaque Automático da Posição ao Importar CSV de Produto

### Problema
O parser já extrai `avgPosition` (coluna "Posicionamento Médio", coluna 21) do CSV Por Produto e salva em `posicao_media`. Porém, quando o CSV de Produto é importado via botão unificado "Importar CSV", não há destaque visual informando que a posição foi detectada. O toast atual mostra `📍 Posição média: #X` mas é sutil e some rápido.

### Mudanças

#### 1. `src/hooks/useAdsData.ts` — Toast mais rico ao detectar posição

Trocar o toast simples por um toast com duração maior e informação contextual quando posição é encontrada:

```typescript
// Quando hasRealPosition = true:
toast.success(`📍 Posição #${avgPos} na Pesquisa detectada!`, {
  description: 'O Posicionamento Médio foi extraído automaticamente do CSV.',
  duration: 5000,
});
// Quando false:
toast.success('Dados do produto importados com sucesso');
```

Aplicar isso tanto no fluxo com `targetAdsDataId` quanto no fluxo sem target.

#### 2. `src/components/roas/AdsProductCard.tsx` — Destaque visual "NEW" na posição

Quando a posição existe e o card acabou de ser atualizado (detectável via `posicao_importada === true`), dar destaque extra no box de posição:
- Adicionar uma animação `animate-pulse` temporária (CSS) no box de posição quando `hasPosition` é true
- Aumentar o contraste do badge de posição (TOPO/PÁG.1) com um ring de destaque
- Mover o box de posição para o **primeiro** KPI box (antes do ROAS) quando posição existe, para dar mais destaque visual à informação mais valiosa

#### 3. `src/components/roas/AdsTab.tsx` — Banner de destaque pós-import

Após importação de CSV de produto com posição detectada, mostrar um banner temporário no topo da lista:

```tsx
{positionJustImported && (
  <div className="rounded-xl border-2 border-success/40 bg-success/10 p-4 flex items-center gap-3 animate-fade-up">
    <MapPin className="w-6 h-6 text-success flex-shrink-0" />
    <div>
      <p className="text-sm font-bold text-success">📍 Posição na Pesquisa Detectada!</p>
      <p className="text-xs text-text-2 mt-0.5">
        O Posicionamento Médio foi extraído automaticamente do CSV Por Produto.
      </p>
    </div>
  </div>
)}
```

Usar um estado `positionJustImported` que fica `true` por 8 segundos após import com posição.

Modificar `handleFileImport` para setar esse estado quando o CSV de produto é detectado e importado com sucesso:

```typescript
if (hasProductMeta || hasPositionHeaders) {
  await importProductCSV(text);
  setPositionJustImported(true);
  setTimeout(() => setPositionJustImported(false), 8000);
}
```

#### 4. `src/components/roas/AdsProductCard.tsx` — Reordenar KPIs quando tem posição

No grid de 3 KPI boxes (state 2/3), quando `hasPosition === true`, mostrar na ordem: **Posição → ROAS → Custo/Un** (posição primeiro, pois é o dado mais valioso extraído do CSV individual). Quando `hasPosition === false`, manter: **ROAS → Posição (com botão importar) → Custo/Un**.

### Arquivos alterados
- `src/hooks/useAdsData.ts` — toast enriquecido
- `src/components/roas/AdsTab.tsx` — banner pós-import + estado temporário
- `src/components/roas/AdsProductCard.tsx` — reordenação de KPIs + destaque visual

### Não altera
- Parser (`shopeeAdsParser.ts`) — já extrai posição corretamente
- `adsLogic.ts`, `AdsDetailView.tsx`
- Nenhuma funcionalidade removida

