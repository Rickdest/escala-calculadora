

## Fix: CSV Geral importa apenas 1 produto

### Diagnóstico

O CSV que você subiu é do formato **Geral** (10 produtos, um por linha). Porém o sistema está classificando errado como "CSV Por Produto" por causa desta detecção no `AdsTab.tsx`:

```typescript
const hasPositionHeaders = lines.some(l =>
  l.includes('palavra-chave/localização') || ...
);
```

O header do seu CSV Geral contém `Palavra-chave/Localização` (coluna 8), então `hasPositionHeaders = true` → chama `importProductCSV()` em vez de `importGeneralCSV()`.

`importProductCSV` só processa `parsed.metrics[0]` (1 produto). Por isso só aparece 1 registro.

### Correção

#### `src/components/roas/AdsTab.tsx` — Corrigir detecção de formato

Remover `palavra-chave/localização` do check `hasPositionHeaders`. Essa coluna existe nos dois formatos. O que diferencia o CSV de Produto é:
- Metadata com `nome do produto` / `id do produto`
- Header com `posicionamento médio`
- Header com `consulta de pesquisa`

Mas `palavra-chave/localização` aparece no Geral também.

A lógica corrigida confia no parser (`parseShopeeAdsCSV`) que já tem `isProductFormat()` e retorna `format: 'general'` ou `format: 'product'`. Em vez de tentar detectar o formato no `AdsTab`, passar o texto para o parser e usar o resultado:

```typescript
const handleFileImport = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseShopeeAdsCSV(text);
  if (!parsed) { toast.error('CSV inválido'); return; }
  
  if (parsed.format === 'product') {
    await importProductCSV(text);
    setPositionJustImported(true);
    setTimeout(() => setPositionJustImported(false), 8000);
  } else {
    await importGeneralCSV(text);
  }
};
```

Isso elimina a detecção duplicada e incorreta no `AdsTab` — o parser já faz essa classificação corretamente.

### Arquivos alterados
- `src/components/roas/AdsTab.tsx`

