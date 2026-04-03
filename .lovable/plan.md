

## Plano: Remover "Tudo" duplicado dos filtros

### Problema

Há dois chips "genéricos" lado a lado: **"Tudo"** (filtro de status) e **"Todos"** (filtro de classificação). Ambos significam "sem filtro" e confundem o usuário.

### Correção

Remover o chip **"Tudo"** do filtro de status. O filtro de classificação "Todos" já cobre o papel de "mostrar tudo". Os chips de status ficam apenas: **Encerrado**, **Em andamento**, **Pausado** — sem o "Tudo". Ao clicar num status ativo, clicar de novo desativa (volta a mostrar todos). Isso elimina a redundância.

### Alterações

**`src/components/roas/AdsTab.tsx`**:
- Remover `{ key: 'all', label: 'Tudo' }` da lista de status chips
- Tornar `statusFilter` um toggle: clicar no filtro ativo volta para `'all'`
- Manter a lógica de filtragem inalterada (quando `statusFilter === 'all'`, mostra tudo)

