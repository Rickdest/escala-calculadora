

## Plano: Adicionar botão "Nova Loja" no dropdown de seleção de loja

### Mudança

No `PageHeader.tsx`, adicionar um item separado no final do `DropdownMenuContent` com um botão "Adicionar loja" que navega para `/stores`.

### Detalhes técnicos

**Arquivo: `src/components/layout/PageHeader.tsx`**

- Importar `useNavigate` de `react-router-dom` e `Plus` de `lucide-react`
- Adicionar `DropdownMenuSeparator` aos imports do dropdown
- Após o `.map()` das lojas, inserir um `DropdownMenuSeparator` e um `DropdownMenuItem` com ícone `Plus` e texto "Adicionar loja"
- Ao clicar, `navigate('/stores')`

