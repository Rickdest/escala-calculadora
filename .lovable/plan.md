

## Drawer de Produto — Layout com 2 Abas (Info + Editar)

### Mudança
Trocar o scroll único atual por 2 abas: **📋 Informações** (somente leitura) e **✏ Editar** (formulário). Header + métricas ficam fixos acima das abas.

### Estrutura

```text
┌─ Header (thumb + nome + preço + ✕)
├─ Badge status (Lucrativo / Prejuízo)
├─ Métricas (Lucro | Margem | vs Meta)
├─ [📋 Informações] [✏ Editar]  ← abas
│
│  ABA INFO (scroll):
│   ├─ Breakdown de Custos
│   ├─ ROAS de Referência
│   ├─ Margem por Canal + link "Editar taxas ✎"
│   ├─ Projeção Mensal (slider)
│   └─ Estoque
│
│  ABA EDITAR (scroll):
│   ├─ Dados do Produto (nome, custo|venda 2cols, embalagem)
│   ├─ Preview live (lucro, margem, ROAS emp.)
│   ├─ Taxas por Canal (cada canal com input % editável)
│   └─ Custos opcionais (collapsible)
│
├─ Footer Info:  🗑 ↗ [✏ Editar produto] (laranja)
└─ Footer Edit:  🗑 ↗ [💾 Salvar alterações] (verde)
```

### Detalhes técnicos — `src/components/ProductDetailDrawer.tsx`

**1. Estado de aba**
- Adicionar `const [activeTab, setActiveTab] = useState<'info'|'edit'>('info')`

**2. Abas visuais**
- Após métricas, inserir row com 2 abas estilo underline (borda inferior laranja na ativa, texto `text-muted-foreground` na inativa)
- Estilo: `border-b-2 border-primary` na ativa, `border-transparent` na inativa

**3. Aba Info** — mover conteúdo existente (breakdown, ROAS, canais read-only, projeção, estoque) para dentro de `{activeTab === 'info' && (...)}`
- Na seção "Margem por Canal", adicionar link "Editar taxas ✎" que chama `setActiveTab('edit')`

**4. Aba Editar** — dentro de `{activeTab === 'edit' && (...)}`
- Seção "Dados do Produto": nome (full width), custo|venda (grid 2 cols), embalagem
- Preview live (card verde com lucro, margem, ROAS empate) — já existe, reutilizar
- Seção "Taxas por Canal": listar cada plataforma com nome, sub-info, e input de % editável
  - Shopee: mostrar taxa fixa das configurações (não editável aqui, link para config)
  - Outros canais: input `%` editável por canal
  - Precisa de estado para fees editáveis por canal (inicializado dos PLATFORM_FEES defaults)
- Seção "Custos opcionais": collapsible placeholder

**5. Footer condicional**
- `activeTab === 'info'`: botão delete + share + "✏ Editar produto" (bg-primary) que chama `setActiveTab('edit')`
- `activeTab === 'edit'`: botão delete + share + "💾 Salvar alterações" (bg-success, disabled se !hasChanges)

**6. Remover** a seção inline de edição com borda laranja (linhas 219-293) — os campos agora vivem na aba Editar

### Campos no estilo do HTML
- Labels: `text-micro uppercase text-muted-foreground` (9px, tracking wide)
- Inputs: `bg-secondary border border-border rounded-lg h-[38px] px-3 font-mono text-body`
- Focus: `focus:border-primary focus:shadow-[0_0_0_2px_rgba(249,115,22,0.1)]`
- Grid 2 cols para Custo|Venda
- Prefixo "R$" ou "%" dentro do input como span muted

### Arquivo modificado
- `src/components/ProductDetailDrawer.tsx` — reestruturação completa do conteúdo em 2 abas

