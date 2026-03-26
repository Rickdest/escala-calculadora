

## Subir Novidades e Atalhos no desktop

### Problema
A coluna direita (Novidades + Atalhos) tem `sticky top-20` que a mantém fixa a 80px do topo. Esse `top-20` está empurrando o conteúdo para baixo demais.

### Alteração
No arquivo `src/pages/Home.tsx`, linha 332:

- De: `sticky top-20 self-start`
- Para: `sticky top-4 self-start`

Isso muda o offset de 80px para 16px, subindo toda a coluna direita.

### Escopo
- Apenas desktop
- Mobile intacto
- Conteúdo dos cards não muda

