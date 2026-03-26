
## Corrigir o espaço “falso” entre hero e calculadora no desktop

### Diagnóstico
O gap não está vindo só de `gap`/`space-y`. O problema principal é estrutural:

- Hoje o desktop está em **2 grids separados**:
  1. `Hero + Novidades`
  2. `Calculadora + Atalhos`
- Como `Hero` e `Novidades` estão na **mesma row**, a altura dessa row passa a ser a do card mais alto (`Novidades`).
- Resultado: mesmo com `items-start`, a **calculadora só começa depois do fim da row inteira**, criando aquele vazio embaixo do hero.

### O que vou alterar
No arquivo `src/pages/Home.tsx`, apenas no bloco desktop (`md:block`):

1. **Trocar a estrutura de 2 grids empilhados por 1 grid principal de 2 colunas**
   - Coluna esquerda:
     - Hero
     - QuickCalculator
     - Outras plataformas
     - Produtos / empty state
   - Coluna direita:
     - Novidades
     - Atalhos
     - alerta de estoque
     - Education

2. **Manter somente desktop**
   - O bloco mobile (`md:hidden`) fica intacto.
   - Nada muda em textos, botões, cores ou sidebar.

3. **Aplicar espaçamento vertical real de 12px dentro de cada coluna**
   - esquerda: hero → calculadora = 12px
   - direita: novidades → atalhos = 12px
   - demais blocos desktop também seguem 12px

4. **Preservar a proporção atual**
   - grid externo continua com algo como `grid-cols-[1fr_320px]`
   - `items-start` continua no grid externo

### Resultado esperado
```text
┌──────────────────────────────┬─────────────────┐
│ HERO                         │ NOVIDADES       │
│                              │ ATALHOS         │
│ CALCULADORA                  │ ALERTA ESTOQUE  │
│ OUTRAS PLATAFORMAS           │ EDUCAÇÃO        │
│ PRODUTOS                     │                 │
└──────────────────────────────┴─────────────────┘
```

Assim a calculadora sobe imediatamente para baixo do hero,