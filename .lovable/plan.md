

## Plano: Banner Carousel + Remoção de duplicatas

### Problema atual
- O DesktopHeader mostra Margem Média, Produtos, Na Meta
- A sidebar da Home repete exatamente as mesmas métricas
- O Hero card é texto estático genérico que não agrega valor

### Solução

**1. `src/pages/Home.tsx` — Substituir Hero card por carousel de banners**

Remover o bloco hero card textual. No lugar, usar um carousel de banners visuais com auto-play. Cada banner é um card com gradiente/cor de fundo, emoji/icone grande, título curto e CTA.

Banners fixos (hardcoded, sem banco):
- "Precifique com precisão" → bg gradient laranja → CTA abre formulário
- "Analise seus Ads" → bg gradient azul → CTA vai para /roas  
- "Controle seu Estoque" → bg gradient verde → CTA vai para /stock

Carousel: usar o componente `Carousel` do embla já existente em `src/components/ui/carousel.tsx` com autoplay. Cada slide tem ~200px de altura, rounded-xl, com conteúdo alinhado à esquerda.

Indicadores: dots abaixo do carousel.

**2. `src/pages/Home.tsx` — Remover métricas duplicadas da sidebar**

Remover da coluna direita:
- Cards "Margem Média" e "Produtos" (já no header)
- Card "na meta · abaixo da meta" (já no header)

Manter na sidebar direita:
- Alerta de estoque baixo
- HomeEducationCard

**3. `src/pages/Home.tsx` — Reorganizar coluna direita**

Com menos conteúdo, a sidebar fica mais limpa:
- Alerta de estoque (se houver)
- Card de educação

No mobile, esses elementos aparecem após a calculadora e ferramentas.

### Arquivos alterados
- `src/pages/Home.tsx` — único arquivo

### Não altera
- Nenhum outro componente ou arquivo
- Lógica de cálculo
- Layout mobile (ferramentas, ordem)

