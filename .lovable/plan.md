

## Plano: Melhorar DesktopHeader — remover métricas, toggle pill, avatar premium

### Alterações em `src/components/layout/DesktopHeader.tsx`

**1. Remover métricas inline (MARGEM MÉDIA, PRODUTOS, NA META)**
- Remover todo o bloco condicional `{stats && stats.totalProducts > 0 && ...}`
- Remover imports não usados (`getMarginStatus`)

**2. Toggle de tema estilo pill (como na imagem)**
- Substituir o botão simples por um toggle pill: container oval com fundo escuro (`bg-surface-2 border border-border`), dois ícones lado a lado (Sol e Lua), e um indicador circular que desliza para o lado ativo
- Transição suave com `transition-all duration-200`
- Tamanho compacto: ~52px largura, 28px altura

**3. Melhorar avatar**
- Aumentar de `w-8 h-8` para `w-9 h-9`
- Usar `bg-primary` com `text-primary-foreground` (laranja sólido com texto branco) em vez do `bg-primary/10` translúcido
- Adicionar `ring-2 ring-primary/20` para destaque sutil
- Remover o texto de nome/status ao lado (simplificar como na referência — só o avatar)

**4. Ordem final**
```
[toggle sidebar] [nome da loja] [flex-1] [toggle tema pill] [avatar]
```

### Arquivo alterado
- `src/components/layout/DesktopHeader.tsx` — único arquivo

