

## Dividir hero desktop em 2 colunas: Hero + Card de Avisos

### O que muda
O hero laranja que hoje ocupa 100% da largura será colocado em um grid de 2 colunas. A esquerda fica o hero (maior parte), e a direita um card de "Novidades / Avisos" com visual escuro, acima da seção de Atalhos.

### Layout

```text
┌──────────────────────────────┬─────────────────┐
│  HERO LARANJA (flex-1)       │  📢 AVISOS      │
│  Título + subtítulo          │  • Novidade 1   │
│  [Precificar] [Ads]          │  • Dica 2       │
│  microcopy                   │  • Update 3     │
└──────────────────────────────┴─────────────────┘
```

### Arquivo: `src/pages/Home.tsx` (apenas desktop, linhas ~265-296)

1. Envolver o hero em `grid grid-cols-[1fr_320px] gap-4` (mesma largura da sidebar direita já existente)
2. Hero laranja fica no slot esquerdo — mesmo conteúdo, sem mudanças
3. Slot direito: novo card com `rounded-2xl border border-border bg-card p-5 h-full` contendo:
   - Título "📢 Novidades" com ícone `Megaphone` ou `Bell`
   - Lista de 3-4 itens estáticos iniciais (ex: "Novo: Calculadora Shein atualizada", "Dica: Importe CSV de Ads", etc.)
   - Cada item com ícone pequeno + texto `text-[13px]`
   - Visual discreto, altura igual ao hero via `h-full`

### Mobile
Nenhuma alteração — o bloco `md:hidden` permanece intacto.

### Detalhes técnicos
- Importar `Bell` do lucide-react
- O card de avisos é estático por ora (hardcoded). Futuramente pode puxar do banco
- O grid `grid-cols-[1fr_320px]` alinha com o grid inferior que já usa a mesma proporção

