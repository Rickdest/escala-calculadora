

## Dropdown no avatar do DesktopHeader

### Mudança
Ao clicar no avatar (canto superior direito do header desktop), abrir um dropdown com duas opções:
1. **Perfil** — navega para `/profile`
2. **Sair** — executa `signOut()` do AuthContext

### Arquivo: `src/components/layout/DesktopHeader.tsx`

- Importar `DropdownMenu`, `DropdownMenuItem`, etc. de `@/components/ui/dropdown-menu`
- Importar `useNavigate` de `react-router-dom`
- Importar `useAuth` de `@/contexts/AuthContext`
- Importar ícones `UserCircle` e `LogOut` do lucide-react
- Envolver o avatar existente em `DropdownMenuTrigger` dentro de um `DropdownMenu`
- Conteúdo do dropdown:
  - Item "Perfil" com ícone `UserCircle` → `navigate('/profile')`
  - Separador
  - Item "Sair" com ícone `LogOut` e texto vermelho → `signOut()`

### Resultado
Avatar vira botão clicável com menu compacto. Sem mudança no mobile.

