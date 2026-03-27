

## Reorganização da Análise de Ads — 4 Mudanças

Após investigar o código atual, adapto as instruções ao que realmente existe no codebase (não existe `ProductAdsDetail.tsx`, não existe `onUpdateCSV`, não existe botão grande "Importar relatório de anúncios" separado).

---

### Mudança 1 — Botão "Novo CSV" discreto no título da lista

**Arquivo:** `src/components/roas/AdsTab.tsx`

**Atual (linhas 478-501):** O título "Anúncios" com AlertDialog "Excluir Tudo" ao lado.

**Novo:** Adicionar botão `Novo CSV` ao lado do título, antes do "Excluir Tudo":

```
<div className="flex items-center justify-between gap-2">
  <h2 className="text-lg font-bold text-foreground">Anúncios</h2>
  <div className="flex items-center gap-2">
    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
      <Upload className="w-3.5 h-3.5" /> Novo CSV
    </button>
    {/* AlertDialog Excluir Tudo — mantido como está */}
  </div>
</div>
```

---

### Mudança 2 — Posição em destaque no topo do AdsDetailFullView

**Arquivo:** `src/components/roas/AdsDetailFullView.tsx`

**a)** Após o grid de KPIs (linha 582), antes do bloco "Unlinked product warning" (linha 584), inserir o card de posição:

```tsx
{ad.posicao_media !== null && (() => {
  const pos = ad.posicao_media!;
  const isTop = pos <= 8;
  const isMid = pos > 8 && pos <= 20;
  const pageLabel = pos <= 3 ? 'Top 3' : pos <= 8 ? '1ª Página' : pos <= 20 ? '2ª Página' : '3ª Página ou mais';
  const posColor = isTop ? 'text-success' : isMid ? 'text-warning' : 'text-destructive';
  const posBg = isTop ? 'bg-success/8 border-success/25' : isMid ? 'bg-warning/8 border-warning/25' : 'bg-destructive/8 border-destructive/25';
  const posHint = isTop ? 'Excelente visibilidade — considere escalar orçamento'
    : isMid ? 'Visibilidade média — reduza a meta de ROAS para subir'
    : 'Visibilidade baixa — reduza a meta de ROAS com urgência';
  return (
    <div className={cn('rounded-xl border p-4 flex items-center justify-between gap-4 mb-5', posBg)}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Posicionamento</p>
        <p className={cn('text-xs font-medium', posColor)}>{posHint}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('font-black font-mono tabular-nums leading-none', posColor)}>
          <span className="text-lg">#</span><span className="text-5xl">{pos}</span>
        </p>
        <p className={cn('text-[11px] font-bold mt-1', posColor)}>{pageLabel}</p>
      </div>
    </div>
  );
})()}
```

This gives position maximum visual prominence right after the KPIs.

---

### Mudança 3 — Botão CSV no header do AdsDetailFullView

**Arquivo:** `src/components/roas/AdsDetailFullView.tsx`

O botão `CSV` já existe na linha 550-552 (`onReimport`). Nenhuma mudança necessária — já está implementado.

---

### Mudança 4 — Remover bloco duplicado de Posicionamento na aba Métricas (opcional cleanup)

O card de "Posicionamento" na aba "Métricas & Histórico" (linhas 942-985) pode ser mantido com informação complementar (barras de distribuição Top 3 / Pág 1 / Pág 2+) já que o novo card no topo é um resumo rápido e o da aba tem detalhes visuais diferentes.

---

### Arquivos modificados
- `src/components/roas/AdsTab.tsx` — adicionar botão "Novo CSV" discreto no título da lista
- `src/components/roas/AdsDetailFullView.tsx` — card de posição em destaque após KPIs

### O que NÃO muda
- Nenhum cálculo, hook, parser ou lógica
- ImportPanel, SummaryCards, FilterChips, AlertsSection
- AdsProductCard (não tem `onUpdateCSV`)
- Aba ROAS

