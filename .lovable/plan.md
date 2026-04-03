

## Plano: Unificar filtros em uma única barra

### Problema

Há duas barras de filtro separadas: "Status do Anúncio" (Tudo, Programado, Em andamento, Pausado, Encerrado, Excluído) e os FilterChips de classificação (Todos, Lucrativos, Atenção, Prejuízo, Pendentes). Devem ser uma linha só.

### Solução

Juntar tudo em uma única barra horizontal de chips. Os chips de status ficam primeiro (quando há campanhas API), seguidos de um separador vertical, e depois os chips de classificação — tudo inline.

### Alterações

**`src/components/roas/AdsTab.tsx`**:
- Remover o `<FilterChips>` como componente separado
- Renderizar status chips + classification chips em um único `<div className="flex gap-2 overflow-x-auto">` 
- Separador `w-px h-5 bg-border` entre os dois grupos (visível apenas quando ambos existem)
- Remover o label "Status do Anúncio" e o wrapper `space-y-3`
- Os classification chips usam a mesma lógica já existente no `FilterChips` (inline aqui)

Resultado: uma única linha de chips rolável, sem duplicação visual.

