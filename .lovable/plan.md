

## Plano: Corrigir thumbnails dos vídeos na aba Educação

### Problema
As thumbnails estão com barras cinzas (letterboxing) porque `hqdefault.jpg` do YouTube tem proporção 4:3 (480x360) sendo forçada em container 16:9.

### Mudança

**Arquivo: `src/pages/Education.tsx`**

1. Trocar `hqdefault.jpg` por `maxresdefault.jpg` (1280x720, 16:9 nativo) — elimina barras cinzas
2. Adicionar fallback com `onError` para `hqdefault.jpg` caso o vídeo não tenha resolução máxima
3. Manter `object-cover` + `aspect-video` para garantir preenchimento total
4. Melhorar visual geral dos cards: `rounded-2xl`, sombra sutil, overlay de play com `shadow-xl`

### Arquivo modificado
- `src/pages/Education.tsx`

