

## Plano: Mostrar instruções abertas por padrão quando pendente + aumentar fontes

### Mudança

No componente `ImportFileColumn`, duas alterações simples:

1. **Iniciar aberto quando pendente**: Trocar `useState(false)` por `useState(!imported)` — se não importou, as instruções já aparecem expandidas. Se já importou, fica fechado.

2. **Aumentar fontes** em todo o card:
   - Título: `text-[11px]` → `text-xs` (12px)
   - Subtítulo: `text-[9px]` → `text-[11px]`
   - Badge (Importado/Pendente): `text-[9px]` → `text-[10px]`
   - "Como obter": `text-[10px]` → `text-[11px]`
   - Header "Onde baixar": `text-[8px]` → `text-[9px]`
   - Steps: `text-[9px]` → `text-[11px]`
   - Step number circle: `text-[8px]` → `text-[9px]`, `w-3.5 h-3.5` → `w-4 h-4`
   - Botão importar: `text-[10px]` → `text-xs`

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx` — linhas 547-599

