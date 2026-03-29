

## Fix: Margem extra na aba Ads (mobile)

### Problema
A página Ads tem margens laterais maiores que a Home porque há padding duplo:
- `AppLayout` já aplica `px-4` no `<main>`
- `RoasAnalysis` (linha 610) adiciona `p-4` no seu wrapper → total de 32px de cada lado no mobile

A Home não tem esse padding extra no conteúdo, por isso fica com 16px corretos.

### Correção

**Arquivo: `src/components/charts/RoasAnalysis.tsx` (linha 610)**

Remover o `p-4` horizontal no mobile, mantendo apenas no desktop:

```
// ANTES
<div className="pb-6 md:pb-4 bg-background rounded-2xl p-4 md:p-6">

// DEPOIS  
<div className="pb-6 md:pb-4 bg-background rounded-2xl px-0 py-2 md:p-6">
```

Isso elimina o padding horizontal duplicado no mobile enquanto mantém o `p-6` no desktop intacto.

**Arquivo: `src/pages/Roas.tsx` (linha 9)**

Ajustar o wrapper para ser consistente com a Home (sem padding vertical extra no mobile):

```
// ANTES
<div className="py-2 md:py-8">

// DEPOIS
<div className="py-1 md:py-8">
```

### Resultado
A aba Ads terá as mesmas margens laterais da Home (16px via AppLayout) no mobile, sem afetar o desktop.

