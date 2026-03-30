

## Redesign da Tela de Login — Estilo da Referência

### Mudanças visuais (sem alterar funcionalidade)

**Arquivo: `src/pages/Auth.tsx`**

**1. Header redesenhado**
- "Precify" em branco (não laranja), ~28px bold
- Subtítulo: "Calcule margem, ROAS e taxas de marketplace em segundos"
- Abaixo: 4 pills/badges horizontais com ícones pequenos: "Margem real", "ROAS ideal", "Taxas auto", "Multi-canal" — fundo `rgba(255,255,255,0.06)`, borda `#252525`, texto `#ccc`
- Remover pill "3 dias grátis · Sem cartão"

**2. Background e Card**
- Page bg: `#0D1117` (azul-escuro profundo como na imagem)
- Card bg: `#111111` com borda `#252525`, border-radius 16px

**3. Tabs "Criar conta / Entrar"**
- Estilo segmented: aba ativa com fundo sólido `#1a1a1a` e texto branco, inativa transparente com texto muted
- Labels: "Criar conta" e "Entrar" (trocar "Já tenho conta" → "Entrar")

**4. Inputs**
- Manter labels uppercase 11px
- Input bg `#1a1a1a`, borda `#252525`, focus border `#e85d00`
- Placeholder mais visível

**5. Botão submit**
- Signup: "Criar conta gratuita →" (com seta), bg `#e85d00`, rounded-xl, h-12
- Login: "Entrar →"

**6. Social proof no rodapé**
- Adicionar abaixo do botão Google: 3 círculos coloridos sobrepostos + "+200 vendedores já usam o Precify" em texto `#666`

**7. Cores alinhadas aos tokens do app**
- Usar `#111111`, `#1a1a1a`, `#222222`, `#252525`, `#e85d00` consistentemente

### Não alterar
- Lógica de auth (signIn, signUp, Google OAuth)
- Validações, tradução de erros
- Checkbox de termos
- Fluxo de navegação

