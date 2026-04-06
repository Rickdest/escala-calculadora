

## Plano: Simplificar thumbnails dos vídeos na Educação

### Problema
As thumbnails com `maxresdefault.jpg` podem não existir para todos os vídeos, causando um flash estranho antes do fallback. O overlay customizado com botão de play vermelho pode estar ficando deslocado visualmente.

### Mudança

**Arquivo: `src/pages/Education.tsx`**

1. **Usar `mqdefault.jpg`** como fonte primária (320x180, 16:9 nativo, sempre disponível) — sem necessidade de fallback
2. **Simplificar o overlay** — remover o botão de play grande vermelho, deixar apenas um ícone de play sutil centralizado com fundo semi-transparente
3. **Manter o comportamento de click-to-play** — ao clicar na thumb, carrega o iframe com autoplay

### Resultado
Thumbnails limpas do próprio YouTube, sem imagens quebradas, sem botões grandes — visual simples e funcional.

### Arquivo modificado
- `src/pages/Education.tsx`

