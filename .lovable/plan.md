

## Plano: Adicionar botão "Sair da conta" na página Perfil (mobile)

### Problema
No mobile, o header com dropdown de logout é oculto (`hidden md:flex`). A página de Perfil não possui botão de sair, deixando o usuário sem forma óbvia de fazer logout quando está nessa tela.

### Mudança

**Arquivo: `src/pages/Profile.tsx`**

Adicionar um botão "Sair da conta" no final da página, após o card de Alterar Senha:

1. Importar `useSignOut` e o ícone `LogOut`
2. Adicionar um botão vermelho (destructive) com ícone de logout no fim da seção `space-y-6`

```tsx
// Após o card de Alterar Senha
<button
  onClick={handleSignOut}
  className="w-full h-12 rounded-xl border border-destructive/30 text-destructive 
             flex items-center justify-center gap-2 text-sm font-semibold 
             hover:bg-destructive/10 transition-colors"
>
  <LogOut className="w-4 h-4" />
  Sair da conta
</button>
```

### Arquivo modificado
- `src/pages/Profile.tsx` — adicionar import do hook + botão de logout

