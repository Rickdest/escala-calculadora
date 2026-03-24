

## Melhorar Filtro de Data na Aba Ads

### Problema Atual
O seletor de período usa um `<select>` nativo HTML dentro da toolbar, que fica pequeno, difícil de ler e visualmente pobre — especialmente em mobile.

### Solução
Extrair o filtro de período para uma seção dedicada abaixo da toolbar, usando chips/botões estilizados (similar aos FilterChips de classificação) em vez de um dropdown nativo.

### Implementação

**Arquivo: `src/components/roas/AdsTab.tsx`**

1. Remover o `<select>` de dentro da toolbar (linhas 166-181)
2. Adicionar uma nova seção de período logo abaixo da toolbar, antes do SummaryCards:

```
┌──────────────────────────────────────────────────────────────┐
│ 📅 Período                                                   │
│                                                              │
│  [Todos]  [23/02 – 23/03]  [01/01 – 31/01]                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Cada período é um chip/botão com estilo ativo (bg-primary, text-white) vs inativo (bg-surface-2, text-muted)
- Mostrar ícone de Calendar no chip ativo
- Se só tem 1 período, mostrar ele selecionado sem opção "Todos"
- Se tem 2+, mostrar "Todos" como primeira opção
- Formato do label: `dd/mm – dd/mm/aaaa` (incluir ano no último)
- No mobile, chips fazem scroll horizontal com `overflow-x-auto`

### Detalhes Técnicos

- Reusar a lógica existente de `periods` e `selectedPeriod` state
- Trocar `formatPeriodLabel` para incluir o ano: `23/02 – 23/03/2026`
- Estilização dos chips consistente com FilterChips (mesma linguagem visual)
- Manter toda a lógica de filtragem por período inalterada

### Arquivo Modificado
- `src/components/roas/AdsTab.tsx` — remover select nativo, adicionar seção de chips de período

