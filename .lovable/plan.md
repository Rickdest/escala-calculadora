

## Ajustes Visuais no Detalhe de Ads

### Arquivo: `src/components/roas/AdsDetailFullView.tsx`

**1. Card de Posição — mais impacto visual (linhas 584-609)**

Substituir o card atual por o layout proposto pelo usuário com:
- Ícone `MapPin` no label "Posicionamento"
- Badge inline com `pageLabel` e cor semântica
- Número da posição em `text-6xl` com `#` em `text-xl`
- Usar `bg-success/5`, `bg-warning/5`, `bg-destructive/5` (em vez de `/8`)
- Adicionar `border-success/25`, `border-warning/25`, `border-destructive/25` separados

**2. Tabs — mais destaque visual (linhas 637-645)**

Atualizar `TabsList` e `TabsTrigger`:
- `TabsList`: `w-full h-11 bg-secondary border border-border rounded-xl p-1`
- `TabsTrigger`: `flex-1 h-9 rounded-lg text-sm font-bold gap-2` com `data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground`

### O que NÃO muda
- Nenhuma lógica de cálculo
- Outros componentes intactos

