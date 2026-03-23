

## Trocar cor do badge Amazon

A cor `#FF9900` (laranja) será substituída por `#232F3E` (azul escuro/navy da Amazon — cor principal do header e branding). Texto continua branco.

### Mudança

**`src/pages/Home.tsx`** — 2 ocorrências (mobile linha 233, desktop linha 351):

```
// de:
{ sigla: 'AZ', name: 'Amazon', rate: '...', tab: 'amazon', bg: '#FF9900', text: 'text-white' }

// para:
{ sigla: 'AZ', name: 'Amazon', rate: '...', tab: 'amazon', bg: '#232F3E', text: 'text-white' }
```

Nenhuma outra alteração.

