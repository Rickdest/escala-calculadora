

## Plano: Aumentar levemente os tamanhos de fonte no app inteiro

### Problema
Textos estão pequenos em várias partes do app, especialmente `body` (13px), `small` (11px) e `micro` (10px).

### Mudança

**Arquivo: `tailwind.config.ts`** — Aumentar a escala tipográfica em ~1px:

| Token | Atual | Novo |
|-------|-------|------|
| display | 24px | 26px |
| title | 18px | 19px |
| subtitle | 15px | 16px |
| body | 13px | 14px |
| small | 11px | 12px |
| micro | 10px | 11px |

**Arquivo: `src/index.css`** — Ajustar os estilos de `section-label`, `label-field` e `label-metric` de `10px` para `11px`.

### Resultado
Aumento sutil (~1px) em toda a escala tipográfica. Melhora a legibilidade sem quebrar layouts existentes.

