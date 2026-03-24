

## Auditoria Completa do App — Segurança, Codigo Morto e Otimizacao

### 1. SEGURANCA (3 problemas encontrados)

**1.1 CRITICO — Escalacao de privilegios na tabela `user_roles`**
A tabela `user_roles` tem uma policy ALL para admins, mas nao tem uma policy INSERT restritiva para usuarios normais. Embora RLS bloqueie inserts por padrao quando nao ha policy permissiva, a seguranca depende de RLS estar ativo. Adicionar uma policy INSERT restritiva explicita que garante que somente admins podem inserir roles.

Migracao SQL:
```sql
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role('admin'::app_role));
```

**1.2 WARN — Tabela `ads_reports` sem policy UPDATE**
Adicionar policy UPDATE para consistencia:
```sql
CREATE POLICY "Users can update own ads reports"
ON public.ads_reports FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**1.3 WARN — Tabela `estoque_movimentacoes` sem policy UPDATE**
```sql
CREATE POLICY "Users can update own estoque_movimentacoes"
ON public.estoque_movimentacoes FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### 2. CODIGO MORTO / IMPORTS NAO UTILIZADOS

**2.1 `src/components/roas/MonthlySalesSimulation.tsx`**
- `TrendingUp` importado mas nunca usado — remover do import

**2.2 `src/hooks/useAdsData.ts`**
- 3 `console.log` de debug (linhas 257, 322) — remover

**2.3 `src/lib/shopeeAdsParser.ts`**
- 1 `console.log` de debug (linha 253) — remover

**2.4 `src/lib/shopeeAdsParser.ts`**
- `parseNumber` (linha 60-64) nunca e usado — somente `parseBRNumber` e usado. Remover.

---

### 3. BUGS / WARNINGS NO CONSOLE

**3.1 Warning: "Function components cannot be given refs" no `AlertsSection`**
O `AlertsSection` e renderizado como filho de `CollapsibleContent` que tenta passar ref. Como `AlertsSection` e um function component sem `forwardRef`, gera warning. Corrigir com `React.forwardRef` ou envolvendo em uma `div`.

---

### 4. OTIMIZACOES

**4.1 `useAdsData` — `data` no array de deps do `importProductCSV`**
O callback `importProductCSV` depende de `data` (state), o que causa re-criacao a cada fetch. A unica uso de `data` dentro dele e para encontrar `existingRow`. Mudar para acessar `data` via ref em vez de dep.

**4.2 `importGeneralCSV` — Delete sem filtro de store**
Linha 125-127: `delete().eq('user_id', ...).is('posicao_media', null)` apaga TODOS os ads_data do usuario sem posicao, incluindo de outras lojas/periodos. Isso pode causar perda de dados. Adicionar filtro por `periodo_inicio`/`periodo_fim` para deletar apenas o mesmo periodo.

**4.3 Chunk splitting — `@radix-ui/react-dialog` no manual chunks**
`@radix-ui/react-dialog` esta listado em `vendor-radix` mas e usado via `alert-dialog` que importa dele indiretamente. Verificar se AlertDialog esta no bundle. Na verdade esta ok, pois alert-dialog usa Dialog internamente.

---

### Resumo de Alteracoes

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Migracao SQL | Seguranca | 3 policies RLS novas |
| `MonthlySalesSimulation.tsx` | Codigo morto | Remover import `TrendingUp` |
| `useAdsData.ts` | Codigo morto | Remover 2 console.log |
| `shopeeAdsParser.ts` | Codigo morto | Remover 1 console.log + funcao `parseNumber` |
| `useAdsData.ts` | Otimizacao | Usar ref para `data` no `importProductCSV` |
| `useAdsData.ts` | Bug fix | Filtrar delete por periodo no `importGeneralCSV` |
| `AlertsSection.tsx` ou `AdsTab.tsx` | Bug fix | Resolver warning de ref |

### Arquivos alterados
- `src/components/roas/MonthlySalesSimulation.tsx`
- `src/hooks/useAdsData.ts`
- `src/lib/shopeeAdsParser.ts`
- `src/components/roas/AdsTab.tsx` (wrapper div para AlertsSection)
- 1 migracao SQL com 3 policies

