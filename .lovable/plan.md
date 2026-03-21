

## Plano: Corrigir link WhatsApp + Mover suporte para o topo da Config

### Problema 1: Link WhatsApp não funciona
O domínio `wa.me` pode ser bloqueado em alguns ambientes. Trocar para `https://api.whatsapp.com/send?phone=5511930291287&text=...` que é mais confiável em todos os dispositivos.

### Problema 2: Suporte invisível no mobile
A seção de suporte está enterrada no final da página (linha 419), depois do botão salvar, tabela de taxas e gerenciar lojas. No mobile o usuário precisa rolar muito para chegar.

### Solução

**`src/pages/Settings.tsx`**
- Mover o card de suporte para logo após o link "Meu Perfil" (linha 129), antes do toggle de tema — fica visível sem scroll
- Trocar URL de `wa.me` para `api.whatsapp.com/send`
- Remover a seção "SUPORTE" duplicada de baixo (linhas 419-438)

**`src/components/layout/Sidebar.tsx`**
- Trocar URL de `wa.me` para `api.whatsapp.com/send`

### Ordem no mobile (Settings)
1. Meu Perfil
2. **Falar com suporte** ← movido para cá
3. Tema do App
4. Minha Loja (margem, vendedor)
5. Custos Opcionais
6. Salvar
7. Taxas da Shopee
8. Gerenciar Lojas
9. Sair

### Arquivos alterados
- `src/pages/Settings.tsx`
- `src/components/layout/Sidebar.tsx`

