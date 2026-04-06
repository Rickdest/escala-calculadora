

## Plano: Trocar iframe do YouTube por thumbnail clicável

### Problema
O embed do YouTube via iframe mostra controles poluídos (botões de compartilhar, relógio, logo YouTube, etc.) diretamente na listagem de vídeos.

### Mudança

**Arquivo: `src/pages/Education.tsx`**

1. **Adicionar estado `playingId`** — controla qual vídeo está tocando (`null` = nenhum)
2. **Substituir o iframe por thumbnail** — Usar a imagem `https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg` como fundo, com um ícone de play centralizado (círculo vermelho + triângulo branco, estilo YouTube)
3. **Ao clicar na thumbnail** — Setar `playingId = video.id`, que troca a thumbnail pelo iframe com `?autoplay=1` para começar a tocar automaticamente
4. **Ao clicar em outro vídeo** — O anterior volta a ser thumbnail (só um iframe ativo por vez, melhor performance)

### Resultado visual
```text
┌─────────────────────────┐
│                         │
│   [thumbnail do video]  │
│       ▶ (play icon)     │
│                         │
├─────────────────────────┤
│ Título do vídeo         │
│ Descrição curta         │
└─────────────────────────┘
```

Ao clicar → thumbnail vira player com autoplay. Layout limpo, sem poluição visual.

