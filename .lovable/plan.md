

## Plano: Corrigir navegação entre produtos no detalhe de Ads

### Bug identificado

Ao navegar entre produtos pelas setas `< 10/11 >`, o `ad` prop muda, mas os estados internos do `AdsDetailFullView` **não resetam**:

1. **`excelData`** — Linha 864: `if (!user || excelData) return;` impede o carregamento de novos dados porque o estado anterior ainda está preenchido
2. **`opLog`** — permanece com os dados do produto anterior

### Correção

Adicionar um `useEffect` que reseta `excelData` e `opLog` quando o `ad.id` muda:

```typescript
useEffect(() => {
  setExcelData(null);
  setOpLog([]);
}, [ad.id]);
```

Isso garante que:
- O efeito de carregamento do Excel (linha 863) será re-executado porque `excelData` voltará a `null`
- O `OperationLogTimeline` já recarrega automaticamente via `loadLog` quando `adProductId`/`adShopeeProductId` mudam
- O scroll já reseta (linha 900)

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx` — adicionar useEffect de reset após linha 612

