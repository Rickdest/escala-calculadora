

## Melhorar Distribuição do Layout no ProductCard

### Problema
Os cards estão com informações empilhadas verticalmente sem estrutura visual clara — margem/lucro, ads e ações ficam em linhas soltas, ocupando espaço desnecessário e sem hierarquia visual.

### Solução
Reorganizar o card em 2 zonas visuais compactas, mantendo todas as informações:

```text
┌──────────────────────────────────────────┐
│ 🖼️  Nome do Produto              ⋮      │
│     Venda R$29,98 · Custo R$10           │
│                                          │
│  ╭─────────────────────────────────────╮ │
│  │ ↗33.3%   R$9,98   #14  ROAS 10.49  │ │
│  │                    ACOS 9.5%  119un │ │
│  ╰─────────────────────────────────────╯ │
│                                          │
│  [↑ Importar Ads]  [⇄ Comparar Canais]  │
└──────────────────────────────────────────┘
```

### Mudanças

**Arquivo: `src/components/cards/ProductCard.tsx`**

1. **Unificar margem + lucro + ads numa faixa única** — Agrupar dentro de um `div` com `bg-surface-2 rounded-lg p-2` como uma "barra de métricas":
   - Esquerda: badges de Margem% e Lucro (coloridos)
   - Direita: métricas Ads (Posição, ROAS, ACOS, unidades) se disponíveis
   - Layout: `flex items-center justify-between` no desktop, `flex flex-wrap gap-1.5` no mobile

2. **Ações numa linha horizontal** — "Importar Ads CSV" e "Comparar Canais" ficam lado a lado na mesma linha, ambos como botões compactos inline com `gap-2`

3. **Remover separação mobile/desktop para margem** — Usar a mesma faixa de métricas em ambos, apenas ajustando tamanho do texto

4. **Posição com mais destaque** — Quando tem posição, mostrar com `text-base font-extrabold` em vez de `text-sm`

### Resultado
- Card mais denso visualmente
- Métricas financeiras + ads numa zona única escaneável
- Ações secundárias ocupam 1 linha em vez de 2
- Menos "mt-2" empilhados = card mais curto

