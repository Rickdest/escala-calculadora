

## Simplificar Import na Tela de Análise de Ads

### Mudança em `src/components/roas/AdsTab.tsx`

**1. Remover o componente `ImportPanel`** (linhas 36-128) — todo o bloco da função `ImportPanel` e seus tipos.

**2. Remover a renderização do `ImportPanel`** (linhas 400-409) — substituir por um header discreto:

```tsx
{/* Header com botão discreto */}
<div className="flex items-center justify-between">
  <div>
    <p className="text-sm font-bold text-foreground">Análise de Ads</p>
    {periodLabel && (
      <p className="text-[11px] text-muted-foreground font-mono">{periodLabel}</p>
    )}
  </div>
  <button
    onClick={() => fileRef.current?.click()}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-[12px] font-semibold text-foreground transition-colors"
  >
    <Upload className="w-3.5 h-3.5" />
    Atualizar CSV
  </button>
</div>
```

**3. Remover o botão "Novo CSV" duplicado** (linhas 481-483) na seção "Anúncios", já que o novo header acima já cumpre essa função.

**4. Cleanup**: Remover `operationLogInputRef`, `operationEvents`, `hasOperationLog`, `handleOperationLogSelect` e o `OperationLogResults` component + sua renderização (linha 472), já que o log de operações pertence ao detalhe do produto. Remover o input hidden do operation log (linha 382). Remover imports não usados (`RefreshCw`).

### O que NÃO muda
- EmptyState para quando `!hasData`
- ImportAdsModal, SummaryCards, FilterChips, AlertsSection
- Lógica de cálculo, hooks, parser

